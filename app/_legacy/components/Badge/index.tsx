interface BadgeProps {
  status: "pending" | "confirm" | "delivered" | string;
}

const Badge = (props: BadgeProps) => {
  return (
    <span className={` rounded-md text-[11px] px-4 py-1 capitalize inline-block ${props.status === 'pending' && 'bg-primary text-white'}
    ${props.status === 'confirm' && 'bg-green-600 text-white'}
    ${props.status === 'delivered' && 'bg-green-700 text-white'}`}>
        {props.status}
    </span>
  );
};

export default Badge;
