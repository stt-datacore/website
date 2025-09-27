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
    hideValue?: boolean;
    onChange?: (value: number) => void;
}

export const Slider = (props: SliderProps) => {

    let movel = 0;
    let oldleft = 0;

    const min = props.min || 0;
    const max = props.max || 100;
    const stepSize = props.stepSize || 10;
    const mainref = React.useRef<HTMLDivElement>(null);
    const buttonref = React.useRef<HTMLButtonElement>(null);
    const [sliderVal, setSliderVal] = React.useState(min);
    const [active, setActive] = React.useState(false);

    const { value, onChange } = props;

    React.useEffect(() => {
        if (onChange) {
            onChange(sliderVal);
        }
    }, [sliderVal]);

    React.useEffect(() => {
        if (value === undefined) return;
        if (value <= min) setSliderVal(min);
        else if (value >= max) setSliderVal(max);
        setSliderVal(value);
    }, [value]);

    let slideval = React.useMemo(() => {
        return positionSlider(sliderVal);
    }, [sliderVal]);

    const buttonWidth = React.useMemo(() => {
        return props.buttonWidth ? (typeof props.buttonWidth === 'number' ? `${props.buttonWidth}px` : props.buttonWidth) : '16px';
    }, [props.buttonWidth]);

    const slideWidth = React.useMemo(() => {
        return props.width ? (typeof props.width === 'number' ? `${props.width}px` : props.width) : '200px';
    }, [props.width]);

    const slideHeight = React.useMemo(() => {
        return props.height ? (typeof props.height === 'number' ? `${props.height}px` : props.height) : '32px';
    }, [props.height]);

    return (
        <div>
            {!props.hideValue && <div style={{textAlign: 'center'}}>{(sliderVal).toFixed(2)}</div>}
            <div ref={mainref} style={{height: slideHeight, width: slideWidth }}
                onMouseUp={deactivate}
                onMouseDown={(e) => barTap(e)}
                onMouseLeave={deactivate}
                onKeyDown={(e) => keyboard(e)}
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
                <div style={{height: '2px', marginTop: `-12px`, borderTop: '1px solid black'}}></div>
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
        e.preventDefault();
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
            oldleft = mleft;
            buttonref.current.style.marginLeft = `${mleft - 8}px`;
            slideval = min + ((mleft / width) * (max - min));
            if (slideval > max) slideval = max;
            if (slideval < min) slideval = min;
            slideval = Math.round(slideval * (1 / stepSize)) / (1 / stepSize);
            setSliderVal(slideval);
            if (props.onChange) props.onChange(slideval);
        }
    }

    function barTap(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        if (!e.buttons || active || !mainref.current || !buttonref.current) return;
        if (e.nativeEvent.target !== mainref.current) return;
        e.preventDefault();
        let mleft = Number(buttonref.current.style.marginLeft.replace('px', '')) + 8;
        let width = mainref.current.offsetWidth;
        const elementRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        let steppix = (stepSize / width) * (max - min);
        slideval = min + ((mleft / width) * (max - min));
        let x = e.clientX - elementRect.left;
        let mx = max;
        let mn = min;

        if (slideval >= mx) slideval = mx;
        if (slideval <= mn) slideval = mn;

        mleft = Number(buttonref.current.style.marginLeft.replace('px', '')) + 8;
        movel = x;
        if (Math.abs(movel) >= steppix) {
            mleft = movel;
            movel = 0;
            if (mleft < 0) mleft = 0;
            if (mleft > width) mleft = width;
            oldleft = mleft;
            buttonref.current.style.marginLeft = `${mleft - 8}px`;
            slideval = min + ((mleft / width) * (max - min));
            if (slideval > max) slideval = max;
            if (slideval < min) slideval = min;
            slideval = Math.round(slideval * (1 / stepSize)) / (1 / stepSize);
            setSliderVal(slideval);
            if (props.onChange) props.onChange(slideval);
        }
        mainref.current.focus();
    }

    function positionSlider(value: number) {
        if (!mainref.current || !buttonref.current) return 0;
        let mleft = Number(buttonref.current.style.marginLeft.replace('px', '')) + 8;
        let width = mainref.current.offsetWidth;
        let steppix = (stepSize / width) * (max - min);
        let slideval = 0;
        mleft = (value / steppix) * stepSize;
        movel = 0;
        if (mleft < 0) mleft = 0;
        if (mleft > width) mleft = width;
        if (oldleft !== mleft) {
            oldleft = mleft;
            slideval = min + ((mleft / width) * (max - min));
            buttonref.current.style.marginLeft = `${mleft - 8}px`;
        }
        return slideval;
    }

    function keyboard(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.ctrlKey) {
            if (e.key === 'ArrowRight') {
                setSliderVal(positionSlider(sliderVal + (stepSize * 10)));
            }
            else if (e.key === 'ArrowLeft') {
                setSliderVal(positionSlider(sliderVal - (stepSize * 10)));
            }
        }
        else {
            if (e.key === 'ArrowRight') {
                setSliderVal(positionSlider(sliderVal + stepSize));
            }
            else if (e.key === 'ArrowLeft') {
                setSliderVal(positionSlider(sliderVal - stepSize));
            }
        }
    }
}