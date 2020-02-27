import React, { Component } from 'react';

type ErrorBoundaryProps = {};

type ErrorBoundaryState = {
	hasError: boolean;
	error: Error;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props) {
		super(props);

		this.state = {
			hasError: false,
			error: undefined
		};
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, info) {
		this.setState({ error });
	}

	render() {
		if (this.state.hasError) {
			return (
				<div>
					<h2>Oops! Something went wrong. Please log a GitHub bug or contact me at admin@datacore.app with these details:</h2>
					<p>{this.state.error ? this.state.error.toString() : 'UNKNOWN ERROR!'}</p>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
