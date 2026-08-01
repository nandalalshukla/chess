import { Chessboard } from "react-chessboard";

export const ChessBoard = () => {
  const chessboardOptions = {
    allowDragging: true,

    showNotation: true,

    animationDurationInMs: 200,
  };

  return <Chessboard options={chessboardOptions} />;
};
