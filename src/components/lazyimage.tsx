import React, { Component } from 'react';
import { Visibility, Image, Loader, ImageProps } from 'semantic-ui-react'

type LazyImageState = {
    show: boolean,
}

class LazyImage extends Component<ImageProps, LazyImageState> {
    static defaultProps = {
        size: `medium`,
    }

    state = {
        show: false,
    }

    showImage = () => {
        this.setState({
            show: true,
        })
    }

    render() {
        const { size } = this.props
        if (!this.state.show) {
            return (
                <Visibility as="span" fireOnMount onTopVisible={this.showImage}>
                    <Loader active inline="centered" size={size} />
                </Visibility>
            )
        }
        return <Image {...this.props} />
    }
}

export default LazyImage;
