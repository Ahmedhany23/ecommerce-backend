const express = require("express");
const app = express();
const cors = require("cors");
const products = require("./products");
const categories = require("./categories");
const mainImage = require('./mainimages');
const PORT = 8080;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.redirect("/products");
});

app.get("/products", (req, res) => {
  const query = req.query.query;
  const priceFrom = parseFloat(req.query.from);
  const priceTo = parseFloat(req.query.to);
  const sortBy = req.query.sortBy;

  console.log("Query parameters received:", query, priceFrom, priceTo, sortBy); // Debugging statement

  let filteredProducts = products;

  if (query) {
    filteredProducts = filteredProducts.filter(product =>
      (product.attributes.title && product.attributes.title.toLowerCase().includes(query.toLowerCase())) ||
      (product.attributes.description && product.attributes.description.toLowerCase().includes(query.toLowerCase())) ||
      (product.attributes.Brand && product.attributes.Brand.toLowerCase().includes(query.toLowerCase())) ||
      (product.attributes.category && product.attributes.category.toLowerCase().includes(query.toLowerCase()))
    );
  }

  if (!isNaN(priceFrom) && !isNaN(priceTo)) {
    filteredProducts = filteredProducts.filter(product =>
      product.attributes.price >= priceFrom && product.attributes.price <= priceTo
    );
  }

  if (sortBy) {
    if (sortBy === 'priceHighToLow') {
      filteredProducts.sort((a, b) => b.attributes.price - a.attributes.price);
    } else if (sortBy === 'priceLowToHigh') {
      filteredProducts.sort((a, b) => a.attributes.price - b.attributes.price);
    } else if (sortBy === 'bestRated') {
      filteredProducts.sort((a, b) => b.attributes.rate - a.attributes.rate);
    }
  }

  console.log("Filtered products:", filteredProducts); // Debugging statement
  res.send(filteredProducts);
});

app.get("/products/:id", async (req, res) => {
  const productId = parseInt(req.params.id, 10); // Convert id from string to number
  const product = products.find(p => p.id === productId);

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
