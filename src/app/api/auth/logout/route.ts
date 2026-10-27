import { back } from "@/lib/http";
import { endSession } from "@/lib/session";

export async function POST(req: Request) {
  await endSession();
  return back(req, "/");
}
