import Skeleton from '../Skeleton';

/**
 * Skeleton placeholder for an order card row (~80px tall).
 */
const OrderCardSkeleton = () => (
  <div className='p-5 border-b border-gray-100'>
    <div className='flex items-start justify-between gap-3'>
      <div className='flex-1 space-y-2'>
        <div className='flex items-center gap-3'>
          <Skeleton width='80px' height='12px' />
          <Skeleton width='120px' height='12px' />
          <Skeleton width='60px' height='20px' borderRadius='999px' />
        </div>
        <div className='flex gap-4'>
          <Skeleton width='100px' height='12px' />
          <Skeleton width='80px' height='12px' />
        </div>
        <div className='flex gap-2 mt-2'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width='40px' height='40px' borderRadius='6px' />
          ))}
        </div>
      </div>
      <Skeleton width='80px' height='14px' />
    </div>
  </div>
);

export default OrderCardSkeleton;
