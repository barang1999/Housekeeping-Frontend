import React from 'react';
import { animated, useSpring } from 'react-spring';
import { Box, Backdrop } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDrag } from '@use-gesture/react'; // Import useDrag

const SpringBottomSheet = ({ open, onClose, children }) => {
  const theme = useTheme();

  // Use a ref to store the current y position for the spring
  const [{ y }, api] = useSpring(() => ({ y: window.innerHeight }));

  // Update spring when 'open' prop changes
  React.useEffect(() => {
    if (open) {
      api.start({ y: 0, immediate: false, config: { tension: 170, friction: 26 } }); // Slide in with gentle config
    } else {
      api.start({ y: window.innerHeight, immediate: false, config: { tension: 170, friction: 26 } }); // Slide out with gentle config
    }
  }, [open, api]);

  const bind = useDrag(({ last, velocity: [, vy], direction: [, dy], movement: [, my], cancel, event, ...state }) => {
    if (open) { // Only allow dragging if the sheet is open
      if (my > 0) { // Only drag downwards
        api.start({ y: my, immediate: true }); // Follow the finger
      } else if (my < 0) { // Prevent dragging upwards past the initial position
        api.start({ y: 0, immediate: true });
      }

      if (last) { // When the drag ends
        // Check if the event target is an in teractive element (e.g., button, input)
        const isInteractiveElement = event.target.closest('button, a, input, textarea, select');
        if (isInteractiveElement) {
          api.start({ y: 0, immediate: false, config: { tension: 170, friction: 26 } }); // Snap back to open, but don't close
          return; // Prevent closing the sheet
        }
        if (my > window.innerHeight * 0.3 || (vy > 0.5 && dy > 0)) { // If dragged down enough or fast enough
          onClose(); // Close the sheet
        } else {
          api.start({ y: 0, immediate: false, config: { tension: 170, friction: 26 } }); // Snap back to open with gentle config
        }
      }
    }
  }, { from: () => [0, y.get()], bounds: { top: 0 }, rubberband: true, threshold: 5 }); // Set bounds to prevent dragging upwards too much, and add threshold for drag sensitivity

  return (
    <>
      {open && <Backdrop open={open} sx={{ zIndex: theme.zIndex.drawer + 1 }} />}
      <animated.div
        {...bind()} // Bind the drag gesture
        style={{
          y, // Apply the animated y value
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.drawer + 2,
          backgroundColor: 'white',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)',
          padding: '16px',
          maxHeight: '98vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </animated.div>
    </>
  );
};

export default SpringBottomSheet;