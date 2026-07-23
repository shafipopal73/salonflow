import { motion } from 'framer-motion';
import { TabsContent } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AnimatedTabContent({ value, className, children }) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <TabsContent value={value} className={className}>{children}</TabsContent>;
  }

  return (
    <TabsContent value={value} className={className}>
      <motion.div
        className="flex-1 min-h-0 flex flex-col"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </TabsContent>
  );
}