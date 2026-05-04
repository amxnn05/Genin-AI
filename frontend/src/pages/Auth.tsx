import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export default function Auth() {
  async function login(provider: "github" | "google") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
    });
    if (error) {
      console.log(error);
    }
  }
  return (
    <>
      <Card className="flex flex-col text-center items-center  justify-center  min-h-screen bg-background text-foreground ">
        <CardHeader>
          {/*<CardTitle>Welcome!</CardTitle>*/}
          {/*<CardDescription className="text-2xl font-bold mb-4 ">
            Sign in to your account to continue
          </CardDescription>*/}
        </CardHeader>
        <CardFooter className="gap-3">
          <Button type="submit" onClick={() => login("google")}>
            Google
          </Button>
          <Button type="submit" onClick={() => login("github")}>
            GitHub
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
