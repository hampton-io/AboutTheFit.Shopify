// Vercel serverless function entry point
import pkg from "@react-router/node";
const { createRequestHandler } = pkg;
import * as build from "../build/server/index.js";

export default createRequestHandler({ build });

