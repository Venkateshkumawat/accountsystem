import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

/**
 * MobileAppWrapper: Injects native-app behavior into the React environment.
 * Handles swipe-back gestures and fluid page transitions.
 */
export const MobileAppWrapper: React.FC<MobileAppWrapperProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Swipe Protocol: Hand-to-Hand Navigation ──
  const handlers = useSwipeable({
    onSwipedRight: () => {
      // 1. First priority: Close any open modals (App-like behavior)
      // We look for elements that indicate a modal is active
      const modalOverlays = document.querySelectorAll('.fixed.inset-0.z-\\[200\\], .fixed.inset-0.z-\\[100\\], .fixed.inset-0.backdrop-blur-sm');
      const closeButtons = document.querySelectorAll('button[title="Close"], button[aria-label="Close"], .modal-close-btn');
      
      if (modalOverlays.length > 0) {
        // If we found a modal, try to close it by clicking the last close button found (usually the top-most modal)
        if (closeButtons.length > 0) {
          (closeButtons[closeButtons.length - 1] as HTMLElement).click();
          return;
        }
        
        // Fallback: search for any X icon button inside the modal
        const xIcons = document.querySelectorAll('button svg.lucide-x, button svg[class*="lucide-x"]');
        if (xIcons.length > 0) {
          (xIcons[xIcons.length - 1].parentElement as HTMLElement).click();
          return;
        }
      }

      // 2. Second priority: Drill-down navigation
      // We only want to 'swipe back' if we are in a sub-page (like an invoice view)
      // or if we are not on one of the 'root' sidebar pages to avoid jumping between main modules.
      const rootPages = [
        '/dashboard', '/pos', '/b2b', '/purchases', '/inventory', 
        '/parties', '/accounting', '/gst', '/reports', 
        '/audit-center', '/staff', '/settings', '/'
      ];
      
      const isRootPage = rootPages.includes(location.pathname);
      const isInvoiceView = location.pathname.startsWith('/invoice-view/');

      // Swiping back on a root page shouldn't take you to the previous root page
      // It should only work for actual detail views or deep links.
      if (isInvoiceView || !isRootPage) {
        navigate(-1);
      }
    },
    trackMouse: false, // Only touch events for mobile authenticity
    delta: 50, // Minimum swipe distance
    preventScrollOnSwipe: true,
  });

  return (
    <div {...handlers} className="min-h-screen w-full overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30,
            opacity: { duration: 0.2 }
          }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MobileAppWrapper;
