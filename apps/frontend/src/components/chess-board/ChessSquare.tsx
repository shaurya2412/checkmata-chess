import { Color, PieceSymbol, Square } from 'chess.js';

// Import chess piece images
import bb from '../../assets/images/bb.png';
import bk from '../../assets/images/bk.png';
import bn from '../../assets/images/bn.png';
import bp from '../../assets/images/bp.png';
import bq from '../../assets/images/bq.png';
import br from '../../assets/images/br.png';
import wb from '../../assets/images/wb.png';
import wk from '../../assets/images/wk.png';
import wn from '../../assets/images/wn.png';
import wp from '../../assets/images/wp.png';
import wq from '../../assets/images/wq.png';
import wr from '../../assets/images/wr.png';

const pieceImages: Record<string, string> = {
  'bb': bb,
  'bk': bk,
  'bn': bn,
  'bp': bp,
  'bq': bq,
  'br': br,
  'wb': wb,
  'wk': wk,
  'wn': wn,
  'wp': wp,
  'wq': wq,
  'wr': wr,
};

const ChessSquare = ({
  square,
}: {
  square: {
    square: Square;
    type: PieceSymbol;
    color: Color;
  };
}) => {
  const imageKey = square ? `${square.color}${square.type}` : '';
  const imageSrc = imageKey ? pieceImages[imageKey] : '';

  return (
    <div className="h-full justify-center flex flex-col ">
      {square && imageSrc ? (
        <img
          className="w-[4.25rem]"
          src={String(imageSrc)}
          alt={`${square.color}${square.type}`}
          loading="eager"
          decoding="async"
        />
      ) : null}
    </div>
  );
};

export default ChessSquare;