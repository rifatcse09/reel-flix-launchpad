
-- Fix: fulfillment event logging trigger should fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_log_fulfillment_event ON public.fulfillment;

CREATE TRIGGER trg_log_fulfillment_event
  AFTER INSERT OR UPDATE ON public.fulfillment
  FOR EACH ROW
  EXECUTE FUNCTION public.log_fulfillment_event();
