import { z } from "zod";

export const signInSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(20, "Username is too long")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(1, "Password is required"),
  keepLoggedIn: z.boolean().optional(),
});

export type SignInFormData = z.infer<typeof signInSchema>;
