import React from "react";
import { Button } from "semantic-ui-react";
import { v4 } from "uuid";


interface SliderProps {
    value?: number;
    min?: number;
    max?: number;
    stepSize?: number;
    width?: string | number;
    height?: string | number;
    buttonWidth?: string | number;
    onChange?: (value: number) => void;
}

export const Slider = (props: SliderProps) => {
    const min = props.min || 0;
    const max = props.max || 100;
    const stepSize = props.stepSize || 10;
    const mainref = React.useRef<HTMLDivElement>(null);
    const buttonref = React.useRef<HTMLButtonElement>(null);
    const [sliderVal, setSliderVal] = React.useState(min);
    const [active, setActive] = React.useState(false);

    const buttonWidth = React.useMemo(() => {
        return props.buttonWidth ? (typeof props.buttonWidth === 'number' ? `${props.buttonWidth}px` : props.buttonWidth) : '16px';
    }, [props.buttonWidth]);

    const slideWidth = React.useMemo(() => {
        return props.width ? (typeof props.width === 'number' ? `${props.width}px` : props.width) : '200px';
    }, [props.width]);

    const slideHeight = React.useMemo(() => {
        return props.height ? (typeof props.height === 'number' ? `${props.height}px` : props.height) : '32px';
    }, [props.height]);

    let slideval = sliderVal;

    let movel = 0;

    return (
        <div>
            <div style={{textAlign: 'center'}}>{(sliderVal * 100).toFixed(2)}</div>
            <div ref={mainref} style={{height: slideHeight, width: slideWidth }}
                onMouseUp={deactivate}
                onMouseLeave={deactivate}
                onMouseMove={(e) => mouseMove(e)}>
                <button
                    ref={buttonref}
                    onMouseDown={() => setActive(true)}
                    className='ui button'
                    style={{
                    width: buttonWidth,
                    height: `calc(${slideHeight}-8px)`,
                    position: 'relative',
                    padding: 0,
                    margin: 0,
                    marginTop: '4px'
                    }}
                    />
                <div style={{height: '2px', marginTop: '-16px', borderTop: '1px solid black'}}></div>
            </div>
        </div>
    )

    function deactivate() {
        setActive(false);
        if (props.onChange) {
            props.onChange(slideval);
        }
    }

    function mouseMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (!e.buttons || !active || !mainref.current || !buttonref.current) return;
        let mleft = Number(buttonref.current.style.marginLeft.replace('px', '')) + 8;
        let width = mainref.current.offsetWidth;
        let steppix = (stepSize / width) * (max - min);
        slideval = min + ((mleft / width) * (max - min));

        let mx = max;
        let mn = min;

        if (e.movementX > 0) {
            if (slideval >= mx) return;
        }
        else if (e.movementX < 0) {
            if (slideval <= mn) return;
        }
        else {
            return;
        }

        mleft = Number(buttonref.current.style.marginLeft.replace('px', '')) + 8;
        movel += e.movementX;
        if (Math.abs(movel) >= steppix) {
            mleft += movel;
            movel = 0;
            if (mleft < 0) mleft = 0;
            if (mleft > width) mleft = width;
            buttonref.current.style.marginLeft = `${mleft - 8}px`;
            slideval = min + ((mleft / width) * (max - min));
            if (slideval > max) slideval = max;
            if (slideval < min) slideval = min;
            setSliderVal(slideval);
            if (props.onChange) props.onChange(slideval);
        }
    }
}