import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Phone } from 'lucide-react';

const helplines = [
  {
    name: 'Tele MANAS (Govt. of India)',
    number: '14416',
    description: 'The national tele-mental health programme of India.',
  },
  {
    name: 'Vandrevala Foundation',
    number: '9999666555',
    description: 'A non-profit for mental health in India, offering free counseling.',
  },
  {
    name: 'AASRA',
    number: '9820466726',
    description: '24/7 helpline for those who are distressed and depressed.',
  },
  {
    name: 'iCALL',
    number: '022-25521111',
    description: 'A psychosocial helpline run by TISS, available Mon-Sat.',
  },
];

export function HelplinePanel() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-headline">
          <Phone />
          Need to talk?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-muted-foreground">
          If you're in crisis or need someone to talk to, these Indian helplines can provide support. You are not alone.
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
