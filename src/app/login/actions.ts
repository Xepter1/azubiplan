"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

// Login-Server-Action für das Formular (via useActionState).
// Rückgabe: Fehlermeldung als String, oder nichts bei Erfolg (dann Redirect).
export async function login(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "E-Mail oder Passwort ist falsch.";
    }
    // Der erfolgreiche Login wirft intern eine Redirect-"Exception" — durchreichen.
    throw error;
  }

  return undefined;
}
