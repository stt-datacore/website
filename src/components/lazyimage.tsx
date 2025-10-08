import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Image, ImageProps, Loader } from 'semantic-ui-react';

const LazyImage = (props: ImageProps) => {
    props.size ??= 'medium';
    const { size } = props;

    const { ref, inView } = useInView({
        /* Optional options */
        threshold: 0,
    });

    return (
        <div ref={ref}>
            {!inView && <Loader active inline="centered" size={size} />}
            {inView && <Image {...props} />}
        </div>
    );
}

export default LazyImage;
