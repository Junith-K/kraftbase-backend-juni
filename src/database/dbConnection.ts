// src/database/dbConnection.ts

import { MongoClient, MongoClientOptions } from "mongodb";

const mongoUrl = "mongodb+srv://junith:test123@cluster0.gyt87si.mongodb.net/";
const dbName = "test";
const collectionName = "kraftbase";
const options: MongoClientOptions = {

  }
  const client = new MongoClient(mongoUrl, options);



export const dbConnection = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

export const closeDbConnection = () => {
  client.close();
  console.log("MongoDB connection closed");
};


export default client