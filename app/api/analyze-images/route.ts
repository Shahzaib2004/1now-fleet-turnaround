import { NextRequest, NextResponse } from "next/server";
import { OpenRouter } from "@openrouter/sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: { message: "No images provided for analysis." } },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";

    if (!apiKey || apiKey === "YOUR_OPENROUTER_API_KEY_HERE" || apiKey === "your-openrouter-key-here") {
      return NextResponse.json(
        { error: { message: "OpenRouter API key is not configured on the server. Please add OPENROUTER_API_KEY to your .env.local file." } },
        { status: 500 }
      );
    }

    const openrouter = new OpenRouter({ apiKey });

    // Construct content array with prompt followed by each base64 image URL
    const userContent: any[] = [
      {
        type: "text",
        text: "You are a car rental return inspector. Analyze the attached vehicle return photos. Identify any visible damages (scuffs, dents, scratches), cleanliness issues (smoke, trash, stains), mechanical issues, dashboard warning lights, or low fuel levels. Provide a concise, bullet-pointed summary (2-3 sentences max) of your findings to be pasted directly into check-in condition notes. Be professional, direct, and specify what you see. If the vehicle looks perfectly fine, write a simple note stating no issues were found."
      },
      ...images.map((base64Data: string) => ({
        type: "image_url",
        imageUrl: {
          url: base64Data
        }
      }))
    ];

    let response;
    try {
      response = await openrouter.chat.send({
        chatRequest: {
          model: model,
          messages: [
            {
              role: "user",
              content: userContent
            }
          ]
        }
      });
    } catch (e: any) {
      // Fallback to openrouter/free if primary model fails (e.g. 429 rate limit)
      if (model !== "openrouter/free") {
        console.warn(`Vision model ${model} failed, falling back to openrouter/free. Error:`, e.message || e);
        response = await openrouter.chat.send({
          chatRequest: {
            model: "openrouter/free",
            messages: [
              {
                role: "user",
                content: userContent
              }
            ]
          }
        });
      } else {
        throw e;
      }
    }

    const choice = response.choices?.[0];
    const text = choice?.message?.content;

    if (!text) {
      throw new Error("No analysis result returned from vision model.");
    }

    return NextResponse.json({ notes: text.trim() });

  } catch (err: any) {
    console.error("Vision Analysis Error:", err);
    return NextResponse.json(
      { error: { message: err.message || "An error occurred during image analysis" } },
      { status: 500 }
    );
  }
}
