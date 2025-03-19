// npm install express ejs bcrypt cookie-parser mongoose jsonwebtoken connect-flash express-session dotenv

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/user");
const Post = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const flash = require("connect-flash");
const session = require("express-session");
const upload = require("./config/multerrconfig")
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
require('dotenv').config()
const app = express();
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables!");
}
const jwtSecret = process.env.JWT_SECRET;

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());


app.use(
  session({
    secret: jwtSecret,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5000 },
  })
);
app.use(flash());


app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success");
  res.locals.error_msg = req.flash("error");
  next();
});


function isLoggedIn(req, res, next) {
  if (!req.cookies.token) {
    req.flash("error", "Please log in first");
    return res.redirect("/login");
  }
  let data = jwt.verify(req.cookies.token, jwtSecret);
  req.user = data;
  next();
}


app.get("/", (req, res) => res.render("index"));


app.get("/login", (req, res) => {
  if (req.cookies.token) {
    jwt.verify(req.cookies.token, jwtSecret);
    req.flash("success", "You are already logged in!");
    return res.redirect("/profile");
  }
  res.render("login");
});


app.get("/profile", isLoggedIn, async (req, res) => {

  let user = await User.findOne({ email: req.user.email }).populate("posts");
  res.render("profile", { user });

});

app.post("/post", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const { postContent } = req.body;

    // Validate the content
    if (!postContent.trim()) {
      req.flash("error", "Post content cannot be empty.");
      return res.redirect("/profile");
    }

    // Ensure user exists
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/profile");
    }

    // Handle image upload (optional)
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`; // Store image path
    }

    // Create the new post
    const newPost = await Post.create({
      title: `@${user.name}`,
      content: postContent,
      user: user._id,
      image: imagePath, // Save image path if available
    });

    // Link the post to the user
    user.posts.push(newPost._id);
    await user.save();

    req.flash("success", "Post shared successfully!");
    res.redirect("/profile");
  } catch (err) {
    console.error("❌ Error creating post:", err);
    req.flash("error", "Something went wrong.");
    res.redirect("/profile");
  }
});

app.get("/notes", isLoggedIn, async (req, res) => {
  try {
    const allPosts = await Post.find().populate("user", "name"); // Fetch all posts with user details
    res.render("notes", { posts: allPosts, user: req.user });
  } catch (err) {
    console.error("❌ Error fetching posts:", err);
    req.flash("error", "Something went wrong.");
    res.redirect("/profile");
  }
});


app.get("/like/:id", isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      req.flash("error", "Post not found.");
      return res.redirect("/notes");
    }

    // Toggle like (add/remove user ID)
    const index = post.likes.indexOf(req.user.userid);
    if (index === -1) {
      post.likes.push(req.user.userid);
      req.flash("success", "Post liked!");
    } else {
      post.likes.splice(index, 1);
      req.flash("success", "Like removed!");
    }

    await post.save();
  } catch (err) {
    console.error("❌ Error liking post:", err);
    req.flash("error", "Something went wrong.");
  }
  const previousPage = req.headers.referer
  if (previousPage.includes("/notes")) {
    return res.redirect("/notes"); // Redirect to notes if the user was there
  } else {
    return res.redirect("/profile"); // Otherwise, go to profile
  }

});


app.get("/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);


    // Restrict edit access to only the post creator
    if (post.user.toString() !== req.user.userid) {
      req.flash("error", "You can only edit your own posts.");
      return res.redirect("/notes");
    }

    res.render("edit", { post });
  } catch (err) {
    console.error("❌ Error fetching post for edit:", err);
    req.flash("error", "Something went wrong.");
    res.redirect("/notes");
  }

});

app.post("/update/:id", isLoggedIn, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);



    // Only allow the owner to edit
    if (post.user.toString() !== req.user.userid) {
      req.flash("error", "Unauthorized action.");
      return res.redirect("/notes");
    }

    post.content = content;
    await post.save();

    req.flash("success", "Post updated successfully!");
  } catch (err) {
    console.error("❌ Error updating post:", err);
    req.flash("error", "Something went wrong.");
  }

  const previousPage = req.headers.referer
  if (previousPage.includes("/notes")) {
    return res.redirect("/notes"); // Redirect to notes if the user was there
  } else {
    return res.redirect("/profile"); // Otherwise, go to profile
  }
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  let user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    req.flash("error", "Invalid email or password");
    return res.redirect("/login");
  }

  let token = jwt.sign({ email, userid: user._id }, jwtSecret, { expiresIn: "1h" });
  res.cookie("token", token, { httpOnly: true });

  req.flash("success", "Login successful!");
  res.redirect("/profile");

});



app.get('/calculator', (req, res) => {
  res.render('calculator')
})

app.post("/register", async (req, res) => {
  let { email, age, password, name, username } = req.body;

  let user = await User.findOne({ email });
  if (user) {
    req.flash("error", "User already exists");
    return res.redirect("/login");
  }

  let hashedPassword = await bcrypt.hash(password, 10);

  let newUser = await User.create({
    username,
    email,
    age,
    name,
    password: hashedPassword,
  });

  let token = jwt.sign({ email, userid: newUser._id }, jwtSecret, { expiresIn: "1h" });
  res.cookie("token", token, { httpOnly: true });

  req.flash("success", "Registered successfully! Please log in.");
  res.redirect("/login");
});


app.get("/logout", (req, res) => {
  res.clearCookie("token");
  req.flash("success", "You have been logged out");
  res.redirect("/login");
});

app.get("/profile/upload", isLoggedIn, (req, res) => {
  res.render("profileupload")
});

app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
  let user = await User.findOne({ email: req.user.email });

  if (!user) {
    req.flash("error", "User not found.");
    return res.redirect("/profile");
  }

  user.profilepic = req.file.filename;
  await user.save();

  req.flash("success", "Profile picture updated successfully!");
  res.redirect("/profile");

});

app.get("/get-ai-help", isLoggedIn, async (req, res) => {
  try {
    const { prompt } = req.query;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
        params: { key: process.env.GOOGLE_AI_KEY },
      }
    );

    console.log("AI API Response:", response.data);

    const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
    res.json({ response: aiResponse });
  } catch (error) {
    console.error(" AI API Error:", error.response?.data || error.message);
    res.json({ response: "Error: " + (error.response?.data?.error?.message || error.message) });
  }
});

const server = http.createServer(app);
const io = new Server(server);
io.on("connection", (socket) => {
  socket.on("joinRoom", (room) => {
    socket.join(room);
  });
  socket.on("sendMessage", ({ room, user, message }) => {
    io.to(room).emit("receiveMessage", { user, message });
  });
});
app.get("/discussion", isLoggedIn, (req, res) => {
  res.render("discussion", { user: req.user });
});



const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
