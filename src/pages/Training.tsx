import Layout from '@/components/layout/Layout';
import VideoCard from '@/components/training/VideoCard';
import { getAllCategories, getVideosByCategory } from '@/data/trainingVideos';
import { GraduationCap } from 'lucide-react';

const Training = () => {
  const categories = getAllCategories();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Training Videos</h1>
          </div>
          <p className="text-muted-foreground">
            Learn how to use ValorWell with these comprehensive training videos organized by feature.
          </p>
        </div>

        {/* Video Categories */}
        <div className="space-y-12">
          {categories.map((category) => {
            const categoryVideos = getVideosByCategory(category);
            
            return (
              <section key={category}>
                <h2 className="text-2xl font-semibold text-foreground mb-6">
                  {category}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Training;