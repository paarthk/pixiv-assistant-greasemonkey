export function execSequentially<T>(items:T[], action:(x:T)=>any){
	items.reduce((acc,cur) => acc.then(() => action(cur)), Promise.resolve());
}

export function promisePool<T>(arr:(() => Promise<T>)[], limit:number):Promise<T[]> {
	let boxedLimit = Math.min(limit, arr.length);
	let next = boxedLimit;
	let crashCount = 0;

	let result = Array(arr.length);
	return new Promise((resolve, reject) => {
		function passBaton<T>(id:number) :Promise<T>{
			if (id >= arr.length) {
				if (++crashCount === boxedLimit) resolve(result);
			} else {
				return arr[id]()
					.then(x => result[id] = x)
					.then(() => passBaton(next++))
			}
		}

		[...Array(boxedLimit).keys()].forEach(passBaton);
	})
}
