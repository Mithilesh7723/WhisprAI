import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Phone } from 'lucide-react';

const helplines = [
  {
    name: 'National Suicide Prevention Lifeline',
    number: '988',
    description: 'For free and confidential support.',
  },
  {
    name: 'Crisis Text Line',
    number: 'Text HOME to 741741',
    description: 'For free, 24/7 crisis counseling.',
  },
  {
    name: 'The Trevor Project',
    number: '1-866-488-7386',
    description: 'For LGBTQ youth.',
  },
];

export function HelplinePanel() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Phone />
          Need to talk?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-muted-foreground">
          If you're in crisis or need someone to talk to, these resources can
          help. You are not alone.
        </p>
        <div className="space-y-4">
          {helplines.map((helpline, index) => (
            <div key={helpline.name}>
              {index > 0 && <Separator className="my-4" />}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold">{helpline.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {helpline.description}
                  </p>
                </div>
                <p className="mt-2 text-lg font-bold text-primary sm:mt-0">
                  {helpline.number}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
