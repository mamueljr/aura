import { Wallet } from 'lucide-react';
import { Button } from '@aura/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@aura/ui/components/card';

export function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="finance-gradient flex size-16 items-center justify-center rounded-2xl text-white shadow-lg">
        <Wallet className="size-8" aria-hidden="true" />
      </div>

      <h1 className="finance-text text-3xl font-bold">Aura Finance</h1>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Esqueleto listo</CardTitle>
          <CardDescription>
            Andamiaje sobre @aura/{'{'}tsconfig,tokens,ui,core,config{'}'}. Sin features todavía.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">Empezar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
