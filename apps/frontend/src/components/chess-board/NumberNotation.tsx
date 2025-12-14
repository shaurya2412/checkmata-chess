const NumberNotation = ({
  label,
  isMainBoxColor,
}: {
  label: string;
  isMainBoxColor: boolean;
}) => {
  return (
    <div
      className={`text-sm font-semibold absolute ${isMainBoxColor ? 'text-[#6B7A5A]' : 'text-[#E8E6D3]'} left-0.5 top-0.5`}
    >
      {label}
    </div>
  );
};

export default NumberNotation;
