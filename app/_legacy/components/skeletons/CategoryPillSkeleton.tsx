import Skeleton from '../Skeleton';

/**
 * Skeleton placeholder for a category pill (circle + short label).
 */
const CategoryPillSkeleton = () => (
  <div className='flex flex-col items-center gap-2'>
    <Skeleton width='70px' height='70px' borderRadius='50%' />
    <Skeleton width='50px' height='12px' />
  </div>
);

export default CategoryPillSkeleton;
