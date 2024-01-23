// Import necessary modules
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

const app = express();
const port = 3000;

// MongoDB connection URI and client
const password = "Ucm@2023";
const encodedPassword = encodeURIComponent(password);
const uri = `mongodb+srv://ucmadmin:${encodedPassword}@lms.7spcfd3.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Enable CORS for all routes
app.use(cors());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Express middleware
app.use(bodyParser.json());

// MongoDB collections
const database = client.db("lms");
const usersCollection = database.collection("user");
const booksCollection = database.collection("book");
const inventoryCollection = database.collection("inventory");
const transactionsCollection = database.collection("transaction");
const paymentsCollection = database.collection("payment");
const branchCollection = database.collection("branch");
const adminCollection = database.collection("admin");
adminCollection;

// Connect to MongoDB Atlas
async function connectToMongoDB() {
  await client.connect();
  console.log("Connected to MongoDB Atlas");
}

// Close MongoDB connection
async function closeMongoDBConnection() {
  await client.close();
  console.log("Closed MongoDB connection");
}

// User Registration endpoint
app.post("/api/users/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if the email is already registered
    const existingUser = await usersCollection.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a new ObjectId for the user
    const userId = new ObjectId();

    // Get the current date for the joined date
    const currentDate = new Date();

    // Save the new user to the database with generated user ID and joined date
    const newUser = {
      _id: userId,
      user_id: userId.toString(),
      username: username,
      email: email,
      password: hashedPassword,
      joined_date: currentDate,
      role: role,
    };

    let result;

    if (role === "Admin") {
      result = await adminCollection.insertOne(newUser);
    } else {
      result = await usersCollection.insertOne(newUser);
    }

    // Include the generated user ID and joined date in the response
    res.status(201).json({
      message: "Registered successfully.",
      userId: userId.toHexString(), // Convert ObjectId to a hex string for response
      joinedDate: currentDate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// User Login endpoint
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    let user;

    if (req.body) {
      // Find the user by email
      console.log('user', req.body);
      if (role == "Admin") {
        user = await adminCollection.findOne({ email: email.trim() });
        console.log('user', user);
      } else {
        user = await usersCollection.findOne({
          email: { $regex: new RegExp(`^${email}$`, "i") },
        });
        console.log('user');
      }

      // if (!user) {
      //   return res.status(401).json({ error: "Invalid email or password" });
      // }

      // Compare the provided password with the hashed password in the database
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      console.log("Provided Password:", password);
      console.log("Stored Password:", user.password);
      console.log("Password Match:", passwordMatch);

      // You can generate a token here and send it as part of the response for authentication
      // For simplicity, we'll just send a success message and the userId
      res.json({
        message: "Login successful",
        userId: user.user_id,
        role: user.role,
      });
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get User Details endpoint
app.get("/api/users/:user_id", async (req, res) => {
  try {
    const userId = req.params.user_id;

    // Check if the user exists
    const user = await usersCollection.findOne({ user_id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // You can customize the response based on your user data structure
    const userDetails = {
      username: user.username,
      user_id: user.user_id,
      email: user.email,
      joined_date: user.joined_date,
      role: user.role,
      // Add other user details as needed
    };

    res.json({ user: userDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// User Account Management endpoint
app.put("/api/users/:user_id", async (req, res) => {
  try {
    const userId = req.params.user_id;
    const { email, password } = req.body;

    // Check if the user exists
    const existingUser = await usersCollection.findOne({
      user_id: ObjectId(userId),
    });
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash the new password before updating
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user information
    const updateUserResult = await usersCollection.updateOne(
      { user_id: userId },
      { $set: { email: email, password: hashedPassword } }
    );

    // Check if the user was updated successfully
    if (updateUserResult.matchedCount === 1) {
      res.json({ message: "User account updated successfully." });
    } else {
      res.status(500).json({ error: "Failed to update user account" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Search Books by Title endpoint
app.get("/api/books/search", async (req, res) => {
  try {
    const { title } = req.query;

    // Check if the title parameter is provided
    if (!title) {
      return res
        .status(400)
        .json({ error: "Title parameter is required for search" });
    }

    // Search for books by title in the books collection
    const searchResults = await booksCollection
      .find({ title: { $regex: new RegExp(title, "i") } })
      .toArray();

    // Format and send the search results in the response
    const formattedResults = searchResults.map((book) => ({
      book_id: book.book_id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      available_copies: book.available_copies,
    }));

    res.json({ books: formattedResults });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Return a Book endpoint
app.post("/api/books/return", async (req, res) => {
  try {
    const { user_id, book_id } = req.body;

    // Check if the user exists
    const user = await usersCollection.findOne({ user_id: user_id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the book exists
    const book = await booksCollection.findOne({ book_id: book_id });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Find the user's open transaction for the specified book
    const openTransaction = await transactionsCollection.findOne({
      user_id: user_id,
      book_id: book_id,
      return_date: null,
    });

    // Check if the user has an open transaction for the specified book
    if (!openTransaction) {
      return res
        .status(400)
        .json({ error: "No open transaction found for the specified book" });
    }

    // Calculate late fee if the book is returned after the due date
    const dueDate = new Date(openTransaction.return_date);
    const currentDate = new Date();

    if (currentDate > dueDate) {
      // Calculate late fee based on your business rules
      // For example, $0.50 per day
      const lateFee =
        0.5 * Math.ceil((currentDate - dueDate) / (1000 * 60 * 60 * 24));

      // Update the transaction with the late fee
      await transactionsCollection.updateOne(
        { _id: openTransaction._id },
        { $set: { return_date: currentDate, late_fee: lateFee } }
      );

      return res.json({
        message: "Book returned successfully with late fee",
        late_fee: lateFee,
      });
    } else {
      // Update the transaction without late fee
      await transactionsCollection.updateOne(
        { _id: openTransaction._id },
        { $set: { return_date: currentDate } }
      );

      return res.json({ message: "Book returned successfully" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Return all Books with Copies endpoint
app.get("/api/books/all", async (req, res) => {
  try {
    // Fetch all books from the 'books' collection
    const allBooks = await booksCollection.find().toArray();

    // Fetch all copies from the 'inventory' collection
    const allCopies = await inventoryCollection
      .find({ status: true })
      .toArray();

    // Filter out books without copies
    const booksWithCopies = await Promise.all(
      allBooks
        .filter((book) =>
          allCopies.some(
            (copy) => String(copy.book_id) === String(book.book_id)
          )
        )
        .map(async (book) => {
          const copiesForBook = await Promise.all(
            allCopies
              .filter((copy) => String(copy.book_id) === String(book.book_id))
              .map(async (copy) => {
                // Fetch branch information based on branch_id
                const branch = await branchCollection.findOne({
                  branch_id: copy.branch_id,
                });
                console.log("copy", copy);
                console.log("branch", branch);

                // Include branch name and location in the copy object
                return {
                  ...copy,
                  branch: {
                    name: branch ? branch.name : "Unknown",
                    location: branch ? branch.location : "Unknown",
                  },
                };
              })
          );

          return { ...book, copies: copiesForBook };
        })
    );

    // Return the list of all books with copies information
    res.json({ books: booksWithCopies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/books/:book_id/copies", async (req, res) => {
  try {
    const book_id = req.params.book_id;

    // Check if the book exists
    const book = await booksCollection.findOne({ book_id: book_id });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Fetch all copies of the specified book from the 'inventory' collection
    const allCopies = await inventoryCollection
      .find({ book_id: book_id })
      .toArray();

    // Retrieve book details
    const bookDetails = {
      book_id: book.book_id,
      title: book.title,
      author: book.author,
      genre: book.genre,
    };

    // Use for...of loop to ensure asynchronous operations are completed before moving forward
    const copiesWithDetails = [];
    for (const copy of allCopies) {
      // Check if 'copy.branch_id' is present before accessing its properties
      if (copy && copy.branch_id) {
        const branch = await branchCollection.findOne({
          branch_id: copy.branch_id.toString(),
        });

        if (branch) {
          copiesWithDetails.push({
            copy_id: copy.copy_id,
            status: copy.status,
            book: bookDetails,
            branch: {
              branch_id: branch.branch_id,
              name: branch.name,
              location: branch.location,
            },
          });
        }
      }
    }
    // Return the list of all copies of the book with details
    res.json({ copies: copiesWithDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Borrow a Book endpoint
app.post("/api/books/:copy_id/borrow", async (req, res) => {
  try {
    const { user_id } = req.body;
    const copy_id = req.params.copy_id;
    console.log("user_id", user_id);

    /// Check if the user exists
    const user = await usersCollection.findOne({ user_id: user_id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the copy exists and is available for borrowing
    const copy = await inventoryCollection.findOne({
      copy_id: copy_id,
      status: true,
    });
    if (!copy) {
      return res
        .status(404)
        .json({ error: "Copy not found or not available for borrowing" });
    }

    // Update the status of the borrowed copy
    const updateResult = await inventoryCollection.updateOne(
      { copy_id: copy_id },
      { $set: { status: false } }
    );

    if (updateResult.matchedCount !== 1) {
      return res
        .status(500)
        .json({ error: "Failed to update inventory status" });
    }

    // Create a new transaction
    const newTransaction = {
      user_id: user_id,
      copy_id: copy_id,
      borrow_date: new Date(),
      return_date: null, // Set to null initially, as the book is not returned yet
      late_fee: 0,
      branch_id: copy.branch_id,
      // Add other transaction-related fields as needed
    };

    await transactionsCollection.insertOne(newTransaction);

    // Send a success response with transaction details
    res.status(201).json({
      message: "Book borrowed successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Renew a Book endpoint
app.post("/api/books/:copy_id/renew", async (req, res) => {
  try {
    const { user_id, transaction_id } = req.body;
    const copy_id = req.params.copy_id;

    // Check if the user exists
    const user = await usersCollection.findOne({ _id: ObjectId(user_id) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the transaction exists
    const transaction = await transactionsCollection.findOne({
      _id: ObjectId(transaction_id),
      user_id: user_id,
      copy_id: copy_id,
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if the book is available for renewal
    if (transaction.return_date) {
      return res
        .status(400)
        .json({ error: "Book is already returned, cannot renew" });
    }

    // Update the return date for renewal
    const renewResult = await transactionsCollection.updateOne(
      { _id: ObjectId(transaction_id) },
      { $set: { return_date: new Date() } }
    );

    if (renewResult.matchedCount !== 1) {
      return res.status(500).json({ error: "Failed to renew book" });
    }

    // Send a success response
    res.json({ message: "Book renewed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// View User Borrowing History endpoint
app.get("/api/users/:user_id/borrowings", async (req, res) => {
  try {
    const userId = req.params.user_id;

    // Check if the user exists
    const user = await usersCollection.findOne({ user_id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch user's borrowing history from the transactions collection
    const userBorrowings = await transactionsCollection
      .find({ user_id: userId })
      .toArray();

    // Format and send the borrowing history in the response
    const formattedBorrowings = await Promise.all(
      userBorrowings.map(async (transaction) => {
        // Get book_id from copy_id
        const copy = await inventoryCollection.findOne({
          copy_id: transaction.copy_id,
        });

        return {
          transaction_id: transaction._id,
          book_id: copy.book_id, // Assuming you have book_id stored in the inventory collection
          book_title: transaction.book_title, // Assuming you have book title stored in the transactions collection
          borrow_date: transaction.borrow_date,
          return_date: transaction.return_date,
          late_fee: transaction.late_fee,
        };
      })
    );

    res.json({ borrowings: formattedBorrowings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all Libraries endpoint
app.get("/api/libraries/all", async (req, res) => {
  try {
    // Fetch all library branches from the 'Branch' collection
    const libraries = await branchCollection.find({}).toArray();

    // Send the list of libraries as the response
    res.json({ libraries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get a Library endpoint
app.get("/api/libraries/:library_id", async (req, res) => {
  try {
    const library_id = req.params.library_id;

    // Fetch the library details from the 'Branch' collection based on library_id
    const library = await branchCollection.findOne({ branch_id: library_id });

    // If the library is not found, return a 404 response
    if (!library) {
      return res.status(404).json({ error: "Library not found" });
    }

    // Send the library details as the response
    res.json({ library });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all books by branch_id endpoint
app.get("/api/books/branch/:branchId", async (req, res) => {
  try {
    const branchId = req.params.branchId;

    // Step 1: Fetch all book copies from the 'inventory' collection for the specified branch with status=true
    const inventoryBooks = await inventoryCollection
      .find({ branch_id: branchId, status: true })
      .toArray();

    // Step 2: If no books are found, return an empty array
    if (inventoryBooks.length === 0) {
      res.json({ books: [] });
      return;
    }

    // Step 3: Extract book_ids from the inventoryBooks
    const bookIds = inventoryBooks.map(
      (inventoryBook) => inventoryBook.book_id
    );

    // Step 4: Fetch details of each book from the 'books' collection
    const booksDetails = await booksCollection
      .find({ book_id: { $in: bookIds } })
      .toArray();

    // Step 5: Send the book details as the response
    res.json({ books: booksDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Late Fee Calculation logic
function calculateLateFee(dueDate) {
  const today = new Date();
  const differenceInDays = Math.floor(
    (today - dueDate) / (1000 * 60 * 60 * 24)
  );

  // Default late fee policy: 50 cents per day
  const lateFee = differenceInDays > 0 ? differenceInDays * 0.5 : 0;
  return lateFee;
}

// Payment Collection and Clearing Late Fees endpoints
app.post("/api/payments", async (req, res) => {
  try {
    const { transactionId } = req.body;

    // Fetch the transaction details from the 'Transaction' collection based on transactionId
    const transaction = await transactionsCollection.findOne({
      _id: ObjectId(transactionId),
    });

    // If the transaction is not found, return a 404 response
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if the late fee is applicable
    const lateFee = calculateLateFee(transaction.return_date);

    // If there is a late fee, record the payment
    if (lateFee > 0) {
      const payment = {
        transaction_id: transactionId,
        amount: lateFee,
        payment_date: new Date(),
        payment_type: "Credit Card", // Assume payment is made through credit card
      };

      // Save the payment details to the 'Payment' collection
      const paymentResult = await paymentsCollection.insertOne(payment);

      // If the payment is added successfully, update the transaction with check-in date and clear late fees
      if (paymentResult.insertedCount === 1) {
        await transactionsCollection.updateOne(
          { _id: ObjectId(transactionId) },
          { $set: { checkin_date: new Date(), late_fee: 0 } }
        );

        // Send a success response
        res.status(201).json({
          message: "Payment successful. Late fees cleared.",
          paymentId: paymentResult.insertedId,
        });
      } else {
        res.status(500).json({ error: "Failed to record payment" });
      }
    } else {
      // If there is no late fee, send a response indicating that no payment is needed
      res.json({ message: "No late fees to clear. Payment not required." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin Book Management endpoint - Add New Book or Update Book Information
app.post("/api/admin/books", async (req, res) => {
  try {
    const { title, author, genre, branch, book_id } = req.body;

    // Check if the book_id is provided
    if (!book_id) {
      // If book_id is not provided, it means it's a new book
      // Check if the book with the same title and author already exists
      const existingBook = await booksCollection.findOne({ title, author });
      if (existingBook) {
        return res.status(400).json({
          error: "Book with the same title and author already exists",
        });
      }

      // Generate a unique book_id (you may use a library or a different method for this)
      const newBookId = generateRandomISBN();

      // Create a new book object
      const newBook = {
        book_id: newBookId,
        title,
        author,
        genre,
      };

      // Add the new book to the 'Books' collection
      const bookResult = await booksCollection.insertOne(newBook);

      // Generate a unique copy_id using ObjectId
      const newCopyId = new ObjectId();

      const inventoryResult = await inventoryCollection.insertOne({
        book_id: newBookId,
        copy_id: newCopyId.toString(),
        status: true,
        branch_id: new ObjectId(branch), // Convert branch to ObjectId
        // Add other inventory-related fields if necessary
      });

      res.status(201).json({
        message: "New book added to the library.",
        bookId: bookResult.insertedId,
        copyId: inventoryResult.insertedId,
      });
    } else {
      // If book_id is provided, it means it's an update to an existing book
      // Check if the book exists in the 'Books' collection
      const existingBook = await booksCollection.findOne({ book_id });
      console.log("existingBook", existingBook);
      if (!existingBook) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Update the book information
      const updatedBook = {
        title: title || existingBook.title,
        author: author || existingBook.author,
        genre: genre || existingBook.genre,
      };

      // Update the book in the 'Books' collection
      const bookUpdateResult = await booksCollection.updateOne(
        { book_id },
        { $set: updatedBook }
      );

      // If the book is updated successfully, update the Inventory collection with available copies
      if (bookUpdateResult.matchedCount === 1) {
        // Assuming `available_copies` is a variable you have defined
        const inventoryUpdateResult = await inventoryCollection.updateOne(
          { book_id },
          {
            $set: {
              branch_id: new ObjectId(branch), // Convert branch to ObjectId
              // Add other inventory-related fields if necessary
            },
          }
        );

        // If the inventory is updated successfully, send a success response
        if (inventoryUpdateResult.matchedCount === 1) {
          res.json({ message: "Book information updated successfully" });
        } else {
          // If there's an issue with updating the Inventory collection, rollback the Book update
          await booksCollection.updateOne({ book_id }, { $set: existingBook });
          res.status(500).json({ error: "Failed to update Inventory" });
        }
      } else {
        res
          .status(500)
          .json({ error: "Failed to update the book information" });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Generate ISBN
function generateRandomISBN() {
  // Format: XXX-XX-XXXXXX-C
  const randomNumber = Math.floor(Math.random() * 1000000000); // 9-digit random number
  const checkDigit = generateCheckDigit(randomNumber.toString());

  const formattedISBN = `${randomNumber.toString().slice(0, 3)}-${randomNumber
    .toString()
    .slice(3, 5)}-${randomNumber.toString().slice(5, 11)}-${checkDigit}`;

  return formattedISBN;
}

function generateCheckDigit(partWithoutCheckDigit) {
  // Calculates the check digit for the ISBN using modulo 11 algorithm
  let sum = 0;
  for (let i = 0; i < partWithoutCheckDigit.length; i++) {
    const digit = parseInt(partWithoutCheckDigit[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

// Admin Book Management endpoint - Remove Book
app.delete("/api/admin/books/:book_id", async (req, res) => {
  try {
    const bookId = req.params.book_id;

    // Check if the book exists in the 'Books' collection
    const existingBook = await booksCollection.findOne({ book_id: bookId });
    if (!existingBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Delete the book from the 'Books' collection
    const bookResult = await booksCollection.deleteOne({ book_id: bookId });

    // If the book is deleted successfully, delete the corresponding record from the 'Inventory' collection
    if (bookResult.deletedCount === 1) {
      const inventoryResult = await inventoryCollection.deleteOne({
        book_id: bookId,
      });

      // If the inventory is deleted successfully, send a success response
      if (inventoryResult.deletedCount === 1) {
        res.json({ message: "Book removed from the library" });
      } else {
        // If there's an issue with deleting from the 'Inventory' collection, rollback the Book deletion
        await booksCollection.insertOne(existingBook);
        res.status(500).json({ error: "Failed to update Inventory" });
      }
    } else {
      res.status(500).json({ error: "Failed to remove the book" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Implement other API endpoints based on your requirements

// Start the server after connecting to MongoDB
async function startServer() {
  try {
    await connectToMongoDB();
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Close MongoDB connection when the server is stopped
process.on("SIGINT", async () => {
  await closeMongoDBConnection();
  process.exit();
});

process.on("SIGTERM", async () => {
  await closeMongoDBConnection();
  process.exit();
});
