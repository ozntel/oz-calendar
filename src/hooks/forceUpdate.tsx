import React, { useState } from 'react';

export default function useForceUpdate() {
	const [value, setValue] = useState(0);
	return {
		forceValue: value,
		forceUpdate: () => setValue((value) => value + 1),
	};
}
