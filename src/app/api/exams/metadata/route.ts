import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getPracticeTestMetadata } from "@/services/vector-store/qdrant";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    // Get comprehensive metadata for the practice test
    const metadata = await getPracticeTestMetadata(templateId);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error in metadata endpoint:", error);
    return NextResponse.json(
      {
        error: "Failed to get metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
