import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppLogo } from '@/components/app-logo';
import { HelplinePanel } from '@/components/helpline-panel';
import { ArrowRight, HeartHandshake, ShieldCheck, Waves } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = placeholderImages.find((img) => img.id === 'hero');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container mx-auto px-4 py-6">
        <AppLogo />
      </header>

      <main className="flex-grow">
        <section className="container mx-auto flex flex-col items-center justify-center gap-12 px-4 py-16 text-center md:py-24 lg:flex-row lg:text-left">
          <div className="max-w-2xl lg:mr-10">
            <h1 className="mb-4 font-headline text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Find your inner shanti.
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Whispr is a safe and anonymous space to share what's on your mind.
              Post short messages, receive supportive AI interactions, and know
              you're not alone.
            </p>
            <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/30">
              <Link href="/feed">
                Enter Whispr <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
          {heroImage && (
            <div className="relative h-64 w-full max-w-md lg:h-80 lg:w-96">
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                priority
                className="rounded-2xl object-cover shadow-2xl"
                data-ai-hint={heroImage.imageHint}
              />
            </div>
          )}
        </section>

        <section className="bg-secondary py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center font-headline text-3xl font-bold">
              A Space for You to Heal
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <Card className="transform transition-transform hover:scale-105 hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 font-headline text-xl font-semibold">
                    Share Anonymously
                  </h3>
                  <p className="text-muted-foreground">
                    Post your thoughts without revealing your identity. Your
                    privacy is our priority.
                  </p>
                </CardContent>
              </Card>
              <Card className="transform transition-transform hover:scale-105 hover:shadow-xl">
                <CardContent className="p-6 text-center">
                   <Waves className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 font-headline text-xl font-semibold">
                    AI Guardian
                  </h3>
                  <p className="text-muted-foreground">
                    Our AI gently reviews whispers to understand their emotional
                    tone and provide support.
                  </p>
                </CardContent>
              </Card>
              <Card className="transform transition-transform hover:scale-105 hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <HeartHandshake className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 font-headline text-xl font-semibold">
                    Get Support
                  </h3>
                  <p className="text-muted-foreground">
                    Chat with an empathetic AI helper or find professional
                    helplines when you need them.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-12">
        <HelplinePanel />
      </footer>
    </div>
  );
}
