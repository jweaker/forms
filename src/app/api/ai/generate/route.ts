import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/better-auth";
import {
  serializeFormForAI,
  validateAIFormStructure,
} from "~/lib/ai-form-utils";
import { db } from "~/server/db";
import { forms } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ??
  "https://ai-services-production-c89a.up.railway.app";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      prompt: string;
      formSlug?: string;
    };

    const { prompt, formSlug } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    let finalPrompt = prompt;

    // If formSlug is provided, fetch existing form and append it to the prompt
    if (formSlug) {
      const existingForm = await db.query.forms.findFirst({
        where: eq(forms.slug, formSlug),
        with: {
          fields: true,
        },
      });

      if (!existingForm) {
        return NextResponse.json({ error: "Form not found" }, { status: 404 });
      }

      // Check if user owns the form
      if (existingForm.createdById !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Serialize form for AI and append to prompt
      const serializedForm = serializeFormForAI(existingForm);
      finalPrompt = `${prompt}\n\nexistingForm:${JSON.stringify(serializedForm)}`;
    }

    // Call AI service with single prompt attribute
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: finalPrompt }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        // Read the body once and store it
        const responseText = await aiResponse.text();
        let errorDetails: unknown;

        try {
          // Try to parse as JSON
          errorDetails = JSON.parse(responseText);
          console.error("AI service error:", errorDetails);
        } catch {
          // If not JSON, use the text as-is
          console.error("AI service error:", responseText);
          errorDetails = responseText;
        }

        // Check if it's a Railway 502 error
        if (
          typeof errorDetails === "object" &&
          errorDetails !== null &&
          "code" in errorDetails &&
          errorDetails.code === 502
        ) {
          return NextResponse.json(
            {
              error:
                "The AI service is currently unavailable or taking too long to respond. Please try again in a moment.",
              details:
                "Railway service returned 502: Application failed to respond",
            },
            { status: 503 },
          );
        }

        return NextResponse.json(
          { error: "AI service error", details: errorDetails },
          { status: 500 },
        );
      }

      const aiData: unknown = await aiResponse.json();

      // Validate AI response
      if (!validateAIFormStructure(aiData)) {
        console.error(
          "Invalid AI response structure:",
          JSON.stringify(aiData, null, 2),
        );
        return NextResponse.json(
          {
            error:
              "AI generated an invalid form structure. Please try again with a different prompt or contact support if the issue persists.",
            details:
              "The AI response did not match the expected format or contained invalid field configurations.",
          },
          { status: 500 },
        );
      }

      // Return the validated form structure
      return NextResponse.json(aiData);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle fetch timeout/abort
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            error:
              "The AI service request timed out. The service may be experiencing high load. Please try again.",
            details: "Request timeout after 60 seconds",
          },
          { status: 504 },
        );
      }

      throw fetchError; // Re-throw to outer catch
    }
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
