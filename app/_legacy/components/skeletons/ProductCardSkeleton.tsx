import Skeleton from '../Skeleton';

/**
 * Skeleton placeholder that matches ProductItem card dimensions.
 */
const ProductCardSkeleton = () => (
  <div className='rounded-lg border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden'>
    <Skeleton height='200px' borderRadius='0' />
    <div className='p-3 space-y-2'>
      <Skeleton height='12px' width='50%' />
      <Skeleton height='14px' width='100%' />
      <Skeleton height='14px' width='70%' />
      <Skeleton height='16px' width='60px' />
      <Skeleton height='36px' width='100%' borderRadius='6px' style={{ marginTop: 8 }} />
    </div>
  </div>
);

export default ProductCardSkeleton;
