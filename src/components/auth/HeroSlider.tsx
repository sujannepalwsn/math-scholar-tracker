import React, { useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Fade from 'embla-carousel-fade';
import Autoplay from 'embla-carousel-autoplay';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  media_url: string;
  mobile_media_url: string | null;
  media_type: 'image' | 'video';
  cta_text: string | null;
  cta_link: string | null;
  overlay_opacity: number;
  text_align: 'left' | 'center' | 'right';
}

interface HeroSliderProps {
  slides: HeroSlide[];
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ slides }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 }, [
    Fade(),
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = React.useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Handle video playback and muting based on active slide
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === selectedIndex) {
        video.muted = isMuted;
        // Attempt to play, catching potential autoplay block errors
        video.play().catch(err => console.log("Video play interrupted or blocked:", err));
      } else {
        video.pause();
      }
    });
  }, [selectedIndex, isMuted, slides]);

  if (!slides || slides.length === 0) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 max-w-full">
      <div className="embla w-full h-full overflow-hidden" ref={emblaRef}>
        <div className="embla__container grid w-full h-full">
          {slides.map((slide, index) => (
            <div className="embla__slide [grid-area:1/1] relative w-full h-full min-w-0" key={slide.id}>
              {/* Media Layer */}
              <div className="absolute inset-0 w-full h-full">
                <div className="w-full h-full relative">
                  {slide.media_type === 'video' ? (
                    isMobile && slide.mobile_media_url ? (
                      <img
                        src={slide.mobile_media_url}
                        alt={slide.title || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : isMobile ? (
                      /* Fallback for mobile if no mobile_media_url provided */
                      <div className="w-full h-full bg-slate-900 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#4f46e520,transparent_70%)] animate-pulse" />
                        <video
                          src={slide.media_url}
                          autoPlay
                          loop
                          playsInline
                          className="w-full h-full object-cover opacity-60"
                        />
                      </div>
                    ) : (
                      <video
                        ref={el => videoRefs.current[index] = el}
                        src={slide.media_url}
                        loop
                        playsInline
                        muted={isMuted}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                           (e.target as any).parentElement.style.backgroundColor = '#020617';
                        }}
                      />
                    )
                  ) : (
                    <img
                      src={isMobile && slide.mobile_media_url ? slide.mobile_media_url : slide.media_url}
                      alt={slide.title || ''}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* Overlay */}
                <div
                  className="absolute inset-0 bg-slate-950"
                  style={{ opacity: slide.overlay_opacity || 0.5 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
              </div>

              {/* Text Content Layer */}
              <div className={cn(
                "relative z-10 w-full h-full flex flex-col px-4 md:px-24 pb-12 md:pb-32 justify-end transition-all duration-500 pointer-events-none",
                slide.text_align === 'center' ? 'items-center text-center' :
                slide.text_align === 'right' ? 'items-end text-right' : 'items-start text-left'
              )}>
                <div className="max-w-4xl w-full pointer-events-auto">
                   <AnimatePresence mode="wait">
                     {selectedIndex === index && (
                       <motion.div
                         initial={{ opacity: 0, y: 30 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -30 }}
                         transition={{ duration: 0.8, ease: "easeOut" }}
                         className="space-y-4 md:space-y-6"
                       >
                         {slide.title && (
                           <h1 className="text-lg sm:text-3xl md:text-5xl lg:text-7xl font-black text-white leading-[0.95] tracking-tighter uppercase mb-1 md:mb-4">
                             {slide.title.split(' ').map((word, i, arr) => (
                               <span key={i} className={cn(i === arr.length - 1 ? "text-primary" : "")}>
                                 {word}{' '}
                               </span>
                             ))}
                           </h1>
                         )}

                         <div className={cn(
                           "flex flex-col md:flex-row justify-between gap-4 md:gap-6",
                           slide.text_align === 'center' ? 'items-center' :
                           slide.text_align === 'right' ? 'items-end' : 'items-start'
                         )}>
                            {slide.subtitle && (
                              <p className="text-[9px] sm:text-sm md:text-lg text-slate-300 font-medium leading-relaxed max-w-xl">
                                {slide.subtitle}
                              </p>
                            )}

                            {slide.cta_text && slide.cta_link && (
                              <div className="shrink-0 mt-2 md:mt-0">
                                <Link to={slide.cta_link}>
                                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-black rounded-full px-3 md:px-8 h-8 md:h-14 text-[10px] md:text-lg shadow-xl shadow-primary/20 group">
                                    {slide.cta_text}
                                    <ArrowRight className="ml-1 md:ml-2 h-2.5 w-2.5 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
                                  </Button>
                                </Link>
                              </div>
                            )}
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      {slides.length > 1 && (
        <>
          {/* Navigation Arrows (Visible on all devices as requested) */}
          <div className="absolute bottom-6 md:bottom-10 right-4 md:right-10 z-30 flex gap-2 md:gap-4">
             <Button
               variant="outline"
               size="icon"
               onClick={() => emblaApi?.scrollPrev()}
               disabled={!canScrollPrev}
               className={cn(
                 "rounded-full bg-white/5 border-white/10 hover:bg-white/20 text-white h-8 w-8 md:h-12 md:w-12 transition-all backdrop-blur-sm",
                 !canScrollPrev && "opacity-50 cursor-not-allowed"
               )}
             >
               <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
             </Button>
             <Button
               variant="outline"
               size="icon"
               onClick={() => emblaApi?.scrollNext()}
               disabled={!canScrollNext}
               className={cn(
                 "rounded-full bg-white/5 border-white/10 hover:bg-white/20 text-white h-8 w-8 md:h-12 md:w-12 transition-all backdrop-blur-sm",
                 !canScrollNext && "opacity-50 cursor-not-allowed"
               )}
             >
               <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
             </Button>
          </div>

          {/* Pagination dots (centered on mobile, left on desktop) */}
          <div className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 md:left-32 md:translate-x-0 z-40 flex gap-1.5 md:gap-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "h-1.5 transition-all duration-500 rounded-full",
                  selectedIndex === index ? "w-6 md:w-10 bg-primary" : "w-1.5 md:w-2 bg-white/20 hover:bg-white/40"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Volume Control Button (Bottom Left) */}
      <div className="absolute bottom-6 md:bottom-10 left-4 md:left-10 z-50">
         <Button
           variant="outline"
           size="icon"
           onClick={() => setIsMuted(!isMuted)}
           className="rounded-full bg-white/5 border-white/10 hover:bg-white/20 text-white h-8 w-8 md:h-12 md:w-12 transition-all backdrop-blur-sm"
           title={isMuted ? "Unmute" : "Mute"}
         >
           {isMuted ? <VolumeX className="h-4 w-4 md:h-6 md:w-6" /> : <Volume2 className="h-4 w-4 md:h-6 md:w-6" />}
         </Button>
      </div>
    </div>
  );
};
