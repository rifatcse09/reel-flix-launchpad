import { MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/13473404523?text=Hi%20ReelFlix%2C%20I%20need%20help%20with%20my%20account.";

const WhatsAppFloatingButton = () => {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl group"
      aria-label="WhatsApp Support"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden sm:inline">WhatsApp Support</span>
    </a>
  );
};

export default WhatsAppFloatingButton;
