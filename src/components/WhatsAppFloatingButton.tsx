import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

const WHATSAPP_NUMBER = "13473404523";

const getWhatsAppMessage = (pathname: string): string => {
  if (pathname.includes("pricing") || pathname === "/#pricing") {
    return "Hi ReelFlix, I have a question about pricing.";
  }
  if (pathname.includes("register") || pathname.includes("checkout")) {
    return "Hi ReelFlix, I need help completing my order.";
  }
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return "Hi ReelFlix, I need technical support.";
  }
  return "Hi ReelFlix, I need help with my account.";
};

const getWhatsAppUrl = (pathname: string): string => {
  const message = encodeURIComponent(getWhatsAppMessage(pathname));
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
};

const WhatsAppFloatingButton = () => {
  const location = useLocation();
  const whatsappUrl = getWhatsAppUrl(location.pathname);

  return (
    <a
      href={whatsappUrl}
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
