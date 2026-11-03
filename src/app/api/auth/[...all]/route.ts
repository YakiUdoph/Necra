import { getAuth } from "@/server/auth";

async function handler(request: Request) {
  return getAuth().handler(request);
}

export { handler as GET, handler as POST };
