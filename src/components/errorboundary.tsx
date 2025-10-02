import React, { Component } from 'react';

type ErrorBoundaryProps = {
	children: React.JSX.Element;
};

type ErrorBoundaryState = {
	hasError: boolean;
	error: Error | undefined;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps | Readonly<ErrorBoundaryProps>) {
		super(props);

		this.state = {
			hasError: false,
			error: undefined
		};
	}

	static getDerivedStateFromError(error: any) {
		return { hasError: true, error };
	}

	componentDidCatch(error: any, info: any) {
		this.setState({ error });
	}

	render() {
		if (this.state.hasError) {
			return (
				<div>
					<h2>Oops! Something went wrong. Please log a <a href="https://github.com/stt-datacore">GitHub</a> bug with these details:</h2>
					<p>{this.state.error ? this.state.error.toString() : 'UNKNOWN ERROR!'}</p>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
