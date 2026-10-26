import { z } from "zod";
import { paginationSchema } from "../../../utils/schema.js";
export const notificationQuerySchema = paginationSchema;
export const notificationUpdateSchema = z.object({ isRead: z.literal(true) }).strict();
