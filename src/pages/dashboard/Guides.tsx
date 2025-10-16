import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Guides = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Apps & Guides</h1>
        <p className="text-muted-foreground mt-2">Download apps and learn how to use ReelFlix</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mobile Apps</CardTitle>
            <CardDescription>Download our apps for iOS and Android</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get the best streaming experience on your mobile device.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Guides</CardTitle>
            <CardDescription>Learn how to get the most out of ReelFlix</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Step-by-step guides for all features and devices.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Guides;