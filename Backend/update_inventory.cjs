const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://crmTest:VenkyCRM%408824@cluster0.kkaa8xd.mongodb.net/Account&Billing";

const realisticNames = [
  "Samsung Galaxy S23 Ultra",
  "Apple MacBook Pro M3",
  "Sony WH-1000XM5 Headphones",
  "Dell XPS 15 Laptop",
  "Apple iPad Air (5th Gen)",
  "Canon EOS R5 Camera",
  "Nintendo Switch OLED",
  "PlayStation 5 Console",
  "Xbox Series X",
  "LG C3 OLED TV",
  "Dyson V15 Vacuum Cleaner",
  "Logitech MX Master 3S Mouse",
  "Apple Watch Series 9",
  "Samsung 990 PRO 2TB SSD",
  "ASUS ROG Strix GeForce RTX 4090",
  "Keychron K2 Mechanical Keyboard",
  "Bose QuietComfort Ultra Earbuds",
  "GoPro HERO12 Black",
  "Ninja Air Fryer Max XL",
  "Garmin Fenix 7X Sapphire Solar",
  "Amazon Echo Dot (5th Gen)",
  "Google Pixel 8 Pro",
  "Razer Blade 16 Gaming Laptop",
  "Oculus Quest 3 VR Headset",
  "DJI Mini 4 Pro Drone",
  "Philips Hue White & Color Ambiance",
  "Secretlab Titan Evo 2022 Chair",
  "Sonos Arc Soundbar",
  "Yeti Rambler 20 oz Tumbler",
  "Anker PowerCore 24K Power Bank"
];

async function updateInventory() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    const products = await productsCollection.find({}).toArray();
    console.log(`Found ${products.length} products to update.`);

    let index = 0;
    for (const product of products) {
      const newName = realisticNames[index % realisticNames.length];
      await productsCollection.updateOne(
        { _id: product._id },
        { $set: { name: newName } }
      );
      index++;
    }

    console.log("Successfully updated all product names!");
  } catch (error) {
    console.error("Error updating inventory:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

updateInventory();
