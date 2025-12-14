const LetterNotation = ({
  label,
  isMainBoxColor,
}: {
  label: string;
  isMainBoxColor: boolean;
}) => {
  return (
    <div
      className={`text-sm font-semibold absolute ${isMainBoxColor ? 'text-[#6B7A5A]' : 'text-[#E8E6D3]'} right-1 bottom-0.5`}
    >
      {label}
    </div>
  );
};

export default LetterNotation;
