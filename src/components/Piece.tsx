import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

interface PieceProps {
    type: PieceType;
    color: PieceColor;
    size: number;
}

const PieceSVG: React.FC<PieceProps> = ({ type, color, size }) => {
    const isWhite = color === 'w';
    const fill = isWhite ? '#FFFFFF' : '#000000';
    const stroke = isWhite ? '#000000' : '#FFFFFF';
    const strokeWidth = 1.5;

    // Standard Chess Piece Paths (Simplified for high performance)
    const renderPiece = () => {
        switch (type) {
            case 'p':
                return (
                    <Path
                        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                    />
                );
            case 'r':
                return (
                    <Path
                        d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                    />
                );
            case 'n':
                return (
                    <Path
                        d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                    />
                );
            case 'b':
                return (
                    <G fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
                        <Path d="M9 36c3.39 7 24.61 7 28 0H9z" />
                        <Path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
                        <Path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
                    </G>
                );
            case 'q':
                return (
                    <G fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
                        <Path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM11.5 30a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM37.5 30a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
                        <Path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-5.5-13.5V25L13 14l-4 12z" />
                        <Path d="M9 26c0 2 1.5 2 2.5 4 2.5 4 22.5 4 25 0 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
                        <Path d="M11.5 30c3.5 3 18.5 3 22 0H11.5z" />
                        <Path d="M9 39h27v-3H9v3z" />
                    </G>
                );
            case 'k':
                return (
                    <G fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
                        <Path d="M22.5 11.63V6M20 8h5" stroke={fill} strokeWidth={3} />
                        <Path d="M22.5 25s4.5-7.5 3-10c-1.5-2.5-6-2.5-6 0-1.5 2.5 3 10 3 10z" />
                        <Path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-1-1-4-1-2.5 0-7 2.5-7 5 0 2.5-4.5 2.5-4.5 2.5s-4.5 0-4.5-2.5c0-2.5-4.5-5-7-5-3 0 0 0-4 1-3 6 6 10.5 6 10.5v7z" />
                        <Path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
                    </G>
                );
            default:
                return null;
        }
    };

    return (
        <Svg width={size} height={size} viewBox="0 0 45 45">
            {renderPiece()}
        </Svg>
    );
};

export default PieceSVG;
