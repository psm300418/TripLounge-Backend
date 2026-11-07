import { Router } from "express";
import { postController } from "./post.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const sharedPostRouter = Router();
sharedPostRouter.get("/:id", asyncHandler(postController.getPost));
