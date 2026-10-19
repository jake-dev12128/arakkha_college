
import { useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";

const slides = [
  {
    src: "/img/c2.png",
    alt: "ACC Computer College campus",
  },
  {
    src: "/img/c3.jpg",
    alt: "Computer laboratory",
  },
  {
    src: "/img/acdemic.jpg",
    alt: "Students learning at ACC",
  },
];

export default function HeroSlideshow({
  children,
  className = "",
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex(
        (current) => (current + 1) % slides.length
      );
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box
      as="section"
      className={`acc-hero-slideshow ${className}`}
      position="relative"
      width="100%"
      overflow="hidden"
      isolation="isolate"
      color="white"
    >
      {slides.map((slide, index) => (
        <Box
          key={slide.src}
          position="absolute"
          inset="0"
          width="100%"
          height="100%"
          zIndex={0}
          bgImage={`url("${slide.src}")`}
          bgSize="cover"
          bgPosition="center"
          bgRepeat="no-repeat"
          opacity={index === activeIndex ? 1 : 0}
          transition="opacity 1.2s ease-in-out"
          aria-hidden={index !== activeIndex}
        />
      ))}

      {/* Dark Overlay */}

      <Box
        position="absolute"
        inset="0"
        zIndex={1}
        bg="rgba(8, 19, 40, 0.60)"
        pointerEvents="none"
      />

      {/* Content */}

      <Box
        position="relative"
        zIndex={2}
        width="100%"
        height="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          width="100%"
          maxWidth="1280px"
          mx="auto"
          px={{ base: 5, md: 8 }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
