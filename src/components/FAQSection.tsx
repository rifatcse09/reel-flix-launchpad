import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-lg">
            Find answers to common questions about ReelFlix
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left text-lg font-semibold">
                How do I cancel my subscription?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                You can cancel your subscription at any time from the Subscriptions page. Your access will continue until the end of your current billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left text-lg font-semibold">
                What devices can I watch on?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                ReelFlix is available on mobile (iOS and Android), web browsers, smart TVs, and streaming devices. You can watch on multiple devices with a single account.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left text-lg font-semibold">
                Is there a free trial?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! New users get a 24-hour free trial to explore all our content and features before subscribing.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left text-lg font-semibold">
                How do I contact support?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                For support inquiries, please email us at support@reelflix.vip or use the chat feature in your dashboard.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
