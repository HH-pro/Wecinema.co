// import React from 'react'

import { useParams } from "react-router-dom";
import { Search, Layout } from "../components";
import cover from '.././assets/public/cover.jpg';

const SearchPage = () => {
	const {slug} = useParams();

	return (
		<Layout expand={false} hasHeader={false}>
		   <div style={{ marginTop: 12 }} className="">
                <div className="flex bg-grey justify-center w-full items-start my-0 mx-auto h-52 sm:h-80">
                    <img
                        className="w-50 h-45"
						src={cover}
                        width="1200"
                        height="200"
                        alt="Cover"
                    />
                </div>
				<div className="flex items-center ">
					<div className="w-full h-full -mt-12">
						<div className="items-center justify-center sm:justify-start flex-col sm:flex-row flex h-full sm:px-8 my-4 mx-auto w-full">
							<div className="overflow-hidden flex-col sm:flex-row flex justify-center mt-12 items-center">
									<span className="z-10 text-black sm:text-6xl relative">
									</span>
								<div className="overflow-hidden">
									<div className="flex items-center  text-left justify-center mb-1 ml-4">
										<h1 className="overflow-hidden text-black text-ellipsis font-extrabold sm:text-6xl mr-4 mt-12 text-base ">
											{slug}
										</h1>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Search search={slug} length={5} type="search"/>
		</Layout>
	);
};

export default SearchPage;
