import { NextRequest, NextResponse } from "next/server";
import { OpenRouter } from "@openrouter/sdk";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      vehicleNickname,
      currentMileage,
      lastServiceMileage,
      fuelLevel,
      nextBooking,
      adr,
      returnConditionNotes,
      previousIssues,
    } = body;

    // Validate request body
    if (
      !vehicleNickname ||
      !currentMileage ||
      !lastServiceMileage ||
      !fuelLevel ||
      !nextBooking ||
      !adr ||
      !returnConditionNotes
    ) {
      return NextResponse.json(
        { error: { message: "Missing required fields" } },
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

    const mileageSinceLast = parseInt(currentMileage) - parseInt(lastServiceMileage);
    const userMessage = `Analyze this vehicle return and produce a turnaround report.

Vehicle: ${vehicleNickname}
Current mileage: ${currentMileage} miles
Last service mileage: ${lastServiceMileage} miles
Miles since last service: ${mileageSinceLast} miles
Fuel level on return: ${fuelLevel}
Next booking in: ${nextBooking}
Operator's average daily rate: $${adr}
Return condition notes: ${returnConditionNotes}
Previous known issues: ${previousIssues || 'None reported'}

Respond with ONLY a valid JSON object in exactly this structure:
{
  "verdict": "GO" | "HOLD" | "FLAG",
  "verdict_reason": "One sentence explaining the verdict",
  "time_to_ready": "e.g. 45 minutes" or "Needs inspection before estimate",
  "revenue_impact": "Plain English sentence about what delay costs at their ADR, e.g. Holding this car for 2 hours costs approximately $5.42 in lost rental time at your $65/day rate",
  "action_items": [
    { "task": "Task name", "urgency": "NOW" | "BEFORE NEXT RENTAL" | "THIS WEEK", "estimated_minutes": number or null, "note": "Optional extra detail" }
  ],
  "maintenance_alerts": [
    { "alert": "Alert description", "severity": "HIGH" | "MEDIUM" | "LOW", "recommendation": "What to do about it" }
  ],
  "cleaning_checklist": [
    { "item": "Checklist item", "flag": true | false }
  ],
  "operator_note": "One paragraph of plain advice from the AI to the operator, written as if from a trusted fleet manager",
  "timing_note": "One sentence about whether the action list feels achievable given the booking window, written as practical advice"
}`;

    const systemPrompt = `You are a fleet operations expert assistant for a car rental company. Your job is to analyze vehicle return data and produce a fast, actionable turnaround report. You help operators decide whether a returned car is ready for the next rental, what actions to take, and what it costs to delay. Be direct, specific, and practical. Never be vague. Always prioritize operator revenue and renter safety equally. Respond only in the JSON format specified. No extra text, no markdown, no explanation outside the JSON.`;

    let response;
    try {
      response = await openrouter.chat.send({
        chatRequest: {
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userMessage
            }
          ]
        }
      });
    } catch (e: any) {
      if (model !== "openrouter/free") {
        console.warn(`Primary model ${model} failed, falling back to openrouter/free. Error:`, e.message || e);
        response = await openrouter.chat.send({
          chatRequest: {
            model: "openrouter/free",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userMessage
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
      throw new Error("No response content from OpenRouter");
    }

    let parsedJson;
    try {
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.substring(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      parsedJson = JSON.parse(cleanedText.trim());
    } catch (e) {
      console.error("Failed to parse JSON response from model:", text);
      return NextResponse.json(
        { error: { message: "Model output was not valid JSON", raw: text } },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedJson);

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: { message: err.message || "An error occurred during analysis" } },
      { status: 500 }
    );
  }
}
