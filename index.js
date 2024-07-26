const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PORT = 8080;
const cloudinary = require('cloudinary').v2;
const products = require("./products"); // Ensure products is initialized
const categories = require("./categories");
const mainImage = require("./mainimages");

const app = express();

cloudinary.config({
  cloud_name: 'dhbwzyd99',
  api_key: 223198673568575,
  api_secret: 'xxf10nqZv5L5blgXp6UYvuu7_bk',
});

// Create 'uploads' directory if it doesn't exist
const uploadDirectory = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Folder to store images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename to avoid conflicts
  },
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(cors());

// Middleware to serve static files from 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.redirect("/products");
});

// POST endpoint to create a new product
app.post("/products", upload.array("images"), async (req, res) => {
  const { title, description, category, price, Brand, rate } = req.body;

  if (!title || !description || !category || !price || !Brand || !rate) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // Upload images to Cloudinary
  const images = {
    data: await Promise.all(
      req.files.map(async (file, index) => {
        const uploadResult = await cloudinary.uploader.upload(file.path, {
          folder: 'product-images',
        });

        return {
          id: index + 1,
          attributes: {
            name: uploadResult.public_id,
            alternativeText: null,
            caption: null,
            width: uploadResult.width,
            height: uploadResult.height,
            formats: {
              thumbnail: {
                name: `thumbnail_${uploadResult.public_id}`,
                hash: `thumbnail_${uploadResult.public_id}`,
                ext: path.extname(file.originalname),
                mime: file.mimetype,
                path: null,
                width: 115, // Placeholder
                height: 156, // Placeholder
                size: null,
                sizeInBytes: null,
                url: uploadResult.secure_url, // Cloudinary URL
                provider_metadata: {
                  public_id: `thumbnail_${uploadResult.public_id}`,
                  resource_type: "image",
                },
              },
              small: {
                name: `small_${uploadResult.public_id}`,
                hash: `small_${uploadResult.public_id}`,
                ext: path.extname(file.originalname),
                mime: file.mimetype,
                path: null,
                width: 367, // Placeholder
                height: 500, // Placeholder
                size: null,
                sizeInBytes: null,
                url: uploadResult.secure_url, // Cloudinary URL
                provider_metadata: {
                  public_id: `small_${uploadResult.public_id}`,
                  resource_type: "image",
                },
              },
            },
            hash: uploadResult.public_id,
            ext: path.extname(file.originalname),
            mime: file.mimetype,
            size: uploadResult.bytes,
            url: uploadResult.secure_url,
            previewUrl: null,
            provider: "cloudinary",
            provider_metadata: {
              public_id: uploadResult.public_id,
              resource_type: "image",
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      })
    ),
  };

  const newProduct = {
    id: products.length + 1,
    attributes: {
      title,
      description,
      category,
      price: parseFloat(price),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      Brand,
      rate: parseFloat(rate),
      images: images,
      comments: [], // Start with an empty comments array
      similarproduct: {
        data: [],
      },
    },
  };

  products.push(newProduct);

  res.status(201).json(newProduct);
});


app.get("/products", (req, res) => {
  const query = req.query.query;
  const priceFrom = parseFloat(req.query.from);
  const priceTo = parseFloat(req.query.to);
  const sortBy = req.query.sortBy;

  console.log("Query parameters received:", query, priceFrom, priceTo, sortBy); // Debugging statement

  let filteredProducts = products;

  if (query) {
    filteredProducts = filteredProducts.filter(
      (product) =>
        (product.attributes.title &&
          product.attributes.title.toLowerCase().includes(query.toLowerCase())) ||
        (product.attributes.description &&
          product.attributes.description
            .toLowerCase()
            .includes(query.toLowerCase())) ||
        (product.attributes.Brand &&
          product.attributes.Brand.toLowerCase().includes(query.toLowerCase())) ||
        (product.attributes.category &&
          product.attributes.category
            .toLowerCase()
            .includes(query.toLowerCase()))
    );
  }

  if (!isNaN(priceFrom) && !isNaN(priceTo)) {
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.attributes.price >= priceFrom &&
        product.attributes.price <= priceTo
    );
  }

  if (sortBy) {
    if (sortBy === "priceHighToLow") {
      filteredProducts.sort((a, b) => b.attributes.price - a.attributes.price);
    } else if (sortBy === "priceLowToHigh") {
      filteredProducts.sort((a, b) => a.attributes.price - b.attributes.price);
    } else if (sortBy === "bestRated") {
      filteredProducts.sort((a, b) => b.attributes.rate - a.attributes.rate);
    }
  }

  console.log("Filtered products:", filteredProducts); // Debugging statement
  res.send(filteredProducts);
});

app.post("/products/:id/comments", (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { user, comment, rating } = req.body;

  if (!user || !comment || isNaN(rating)) {
    return res.status(400).json({ error: "User, comment, and valid rating are required." });
  }

  const product = products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).send({ message: "Product not found" });
  }

  const newComment = {
    user,
    comment,
    rating: parseInt(rating, 10),
  };

  product.attributes.comments.push(newComment);

  res.status(201).json(newComment);
});

// Get product details with comments
app.get("/products/:id", (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const product = products.find((p) => p.id === productId);

  if (product) {
    res.send(product);
  } else {
    res.status(404).send({ message: "Product not found" });
  }
});

app.get("/categories", (req, res) => {
  res.send(categories);
});

app.get("/mainimages", (req, res) => {
  res.send(mainImage);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
