import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const StartWatching = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Start watching</h1>
        <p className="text-muted-foreground mt-2">Choose your device and start streaming</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>📱 Mobile</CardTitle>
            <CardDescription>Download our app to watch on your mobile device</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Available for iOS and Android. Scan the QR code or download from your app store.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🌐 Web - watch browser</CardTitle>
            <CardDescription>Stream directly in your browser</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click to start watching in a new browser tab. No downloads required.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StartWatching;