import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">FAQ</h1>
        <p className="text-muted-foreground mt-2">Frequently asked questions</p>
      </div>

      <Accordion type="single" collapsible className="w-full max-w-3xl">
        <AccordionItem value="item-1">
          <AccordionTrigger>How do I cancel my subscription?</AccordionTrigger>
          <AccordionContent>
            You can cancel your subscription at any time from the Subscriptions page. Your access will continue until the end of your current billing period.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>What devices can I watch on?</AccordionTrigger>
          <AccordionContent>
            ReelFlix is available on mobile (iOS and Android), web browsers, smart TVs, and streaming devices. You can watch on multiple devices with a single account.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>How do I change my password?</AccordionTrigger>
          <AccordionContent>
            Navigate to the "Change password" section in your dashboard sidebar. Enter your new password twice and click "Update Password".
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>Is there a free trial?</AccordionTrigger>
          <AccordionContent>
            Yes! New users get a 24-hour free trial to explore all our content and features before subscribing.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>How do I contact support?</AccordionTrigger>
          <AccordionContent>
            For support inquiries, please email us at support@reelflix.com or use the chat feature in your dashboard.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FAQ;