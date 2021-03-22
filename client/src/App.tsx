import React from 'react';
import './App.scss';
import { createApiClient, Ticket, Answer, SORT_DATE, SORT_TITLE, SORT_EMAIL, SORT_DESC,
	SORT_DEFAULT, PAGE_DEFAULT, DATE_VERB_DEFAULT, DATE_VERB_BEFORE,
	DATE_VERB_AFTER, EMAIL_VERB, PAGE_SIZE, SEARCH_BY_LABEL_DEFAULT } from './api';
import TicketComponent from './Components/TicketComponent';
let logo = require('./images/IndexOutofBoundsLogo.png');


const defAxios = require('axios').default;

defAxios.interceptors.request.use( (x: any) => {
    x.meta = x.meta || {}
    x.meta.requestStartedAt = new Date().getTime();
    return x;
})

defAxios.interceptors.response.use((x: any) => {
		responseTime = new Date().getTime() - x.config.meta.requestStartedAt;
    return x;
})

let responseTime: number = 0;

export type AppState = {
	superSearch: boolean,
	searchByLabel: string,
	tickets: Ticket[],
	labels: string[],
	search: string,
	lastSort: number,
	page: number,
	date: string,
	dateVerb: string,
	from: string,
	title: string,
	header:string,
	responseTime: number,
	showTicketView: boolean,
	featuredTicket?: Ticket,
	hiddenTicketsList: Ticket[],
	staredTicketList: Ticket[],
	staredTicketView: boolean,
}

const api = createApiClient();

export class App extends React.PureComponent<{}, AppState> {

	state: AppState = {
		superSearch: false,
		searchByLabel: SEARCH_BY_LABEL_DEFAULT,
		tickets: [],
		labels: [],
		search: "",
		lastSort: SORT_DEFAULT,
		page: PAGE_DEFAULT,
		date: "",
		dateVerb: DATE_VERB_DEFAULT,
		from: "",
		title: "",
		header:"",
		responseTime: 0,
		showTicketView: false,
		hiddenTicketsList: [],
		staredTicketList: [],
		staredTicketView: false,
	}

	searchDebounce: any = null;

	async componentDidMount() {
		this.setState({
			labels: await api.getLabels(true),
			tickets: await api.getTickets(this.state.superSearch, this.state.lastSort,
				this.state.page, this.state.date, this.state.dateVerb, this.state.from, this.state.title, this.state.searchByLabel),
		});
		document.addEventListener('scroll', this.getNextPage);
	}

	getNextPage = async () => {
		if(window.innerHeight + window.scrollY > document.body.offsetHeight){
			//case: we already got all the search results so need to fetch more.
			if(this.state.tickets.length < this.state.page * PAGE_SIZE) return;

			//case: get more results.
			this.setState({
				page: this.state.page + 1,
				tickets: await api.getTickets(this.state.superSearch, this.state.lastSort, this.state.page + 1,
						this.state.date, this.state.dateVerb, this.state.from, this.state.title, this.state.searchByLabel)
			});
		}
	}

	getNextPageByClick = async () => {
			//case: we already got all the search results so need to fetch more.
			if(this.state.tickets.length < this.state.page * PAGE_SIZE - 1) return;


			//case: get more results.
			this.setState({
				page: this.state.page + 1,
				tickets: await api.getTickets(this.state.superSearch, this.state.lastSort, this.state.page + 1,
						this.state.date, this.state.dateVerb, this.state.from, this.state.title, this.state.searchByLabel)
			});

	}

	parseSearch = async () => {
		const search = this.state.search.trim();
		let date = "";
		let dateVerb = "";
		let from = "";
		let title = "";

		if(search.startsWith(DATE_VERB_AFTER) || search.startsWith(DATE_VERB_BEFORE)){
			const verb = search.split(':');
			dateVerb = verb[0];
			if(verb.length === 2){
				const dateTitle = verb[1].split(' ');
				//formate date to mm/dd/yyy for Date obj.
				let formatDate:string[] = dateTitle[0].split('/');
				if(formatDate.length === 3){
					[formatDate[0], formatDate[1]] = [formatDate[1], formatDate[0]]
				}
				let inputDate:string = formatDate.join('/');
				if(!isNaN(Date.parse(inputDate))){
					date = inputDate;
				}if(dateTitle.length === 2){
					title = dateTitle[1];
				}
			}
		}else if(search.startsWith(EMAIL_VERB)){
			const verb = search.split(':');
			dateVerb = verb[0];
			if(verb.length === 2){
				const emailTitle = verb[1].split(' ')
				if(emailTitle.length === 2){
					from = emailTitle[0];
					title = emailTitle[1];
				} else {
					from = verb[1];
				}
			}
		}else {
			title = search
		}

		this.setState({
			date: date,
			dateVerb: dateVerb,
			from: from,
			title: title,
			tickets: await api.getTickets(this.state.superSearch, this.state.lastSort,
				this.state.page, date, dateVerb, from, title, this.state.searchByLabel),
			responseTime: responseTime,
			hiddenTicketsList: [],
		});
	}

	renderTickets = (tickets: Ticket[]) => {

		return (<ul className='tickets'>
			{tickets.map((ticket) => (<TicketComponent key={ticket.id}
				handleExpandClick={this.handleExpandClick} patchStar={this.patchStar}
				ticket={ticket} patchAnswer={this.patchAnswer} patchTitle={this.patchTitle} handleHideClick={this.handleHideClick}/>))}
		</ul>);
	}

	seachByLabel = async (label: string) => {
		this.setState({
			searchByLabel: label,
			tickets: await api.getTickets(this.state.superSearch, this.state.lastSort, this.state.page,
				this.state.date, this.state.dateVerb, this.state.from, this.state.title, label),
			hiddenTicketsList: [],
		});
	}

	renderLabels = () => {
		return (<div className='labels'>
		<span key={SEARCH_BY_LABEL_DEFAULT} onClick={() => this.seachByLabel(SEARCH_BY_LABEL_DEFAULT)}
		className='label'>{SEARCH_BY_LABEL_DEFAULT}</span>
			{this.state.labels.map((label) => (<span key={label}onClick={() => this.seachByLabel(label)}
			className={this.state.searchByLabel === label ? 'label press' : 'label'}>{label}</span>))}
		</div>);
	}

	patchTitle = async (newTitle: string, ticketID: string) => {
		const tickets = [...this.state.tickets];
		const t:Ticket | undefined = tickets.find((t: Ticket) => t.id.localeCompare(ticketID) === 0);
		if(t === undefined) return;

		const newTicket: Ticket = {
				id: ticketID,
				title: newTitle,
				content: "",
				creationTime: 0,
				userEmail: "",
				labels: [],
				answers: [],
			}
		await api.patchTicketAPI(newTicket);
	}

	patchAnswer = async (email:string, reply:string, creationTime:string, ticketID:string) => {
		const tickets = [...this.state.tickets];
		if(this.state.featuredTicket === undefined || ticketID.localeCompare(this.state.featuredTicket.id) !== 0) {
			console.log('unexpected error, posting answer');
			return;
		}

		let t: Ticket = this.state.featuredTicket;
		const answer: Answer = {email, reply, creationTime, ticketID};
		let newAnswers: Answer[] = [];
		if(t.answers){
			newAnswers.push(...t.answers, answer);
		} else{
			newAnswers = [answer];
		}

		t.answers = newAnswers;
		this.setState({
			tickets
		})

		const newTicket: Ticket = {
			id: ticketID,
			title: "",
			content: "",
			creationTime: 0,
			userEmail: "",
			labels: [],
			answers: newAnswers,
			}

		await api.patchTicketAPI(newTicket);
	}

	patchStar = async (isStared: boolean, ticketID: string) => {
		const tickets = [...this.state.tickets];
		const t:Ticket | undefined = tickets.find((t: Ticket) => t.id.localeCompare(ticketID) === 0);
		if(t === undefined) return;

		const newTicket: Ticket = {
				id: ticketID,
				title: "",
				content: "",
				creationTime: 0,
				userEmail: "",
				labels: [],
				answers: [],
				isStared: isStared,
			}
		await api.patchTicketAPI(newTicket);
	}

	onSearch = async (val: string, newPage?: number) => {

		clearTimeout(this.searchDebounce);
		this.searchDebounce = setTimeout(async () => {
			this.setState({
				search: val
			});
			this.parseSearch();
		}, 1000);
	}

	sortTickets = async (sortBy: number) => {
		if(sortBy !== SORT_DEFAULT && this.state.lastSort === sortBy ){
			sortBy <= SORT_DESC ? sortBy += SORT_DESC : sortBy -= SORT_DESC
		}
		this.setState({
			lastSort: sortBy,
			tickets: await api.getTickets(this.state.superSearch, sortBy, this.state.page,
				this.state.date, this.state.dateVerb, this.state.from, this.state.title, this.state.searchByLabel),
			hiddenTicketsList: [],
		});
	}

	renderHeader = () => {
		if(this.state.header.localeCompare('about') === 0){
			return(
				<div className='aboutCon'>
				<div className='about'>
				<h3 className='welcomeSite'>Welcome to the site!</h3>
				You are welcome to search the questions.
				Don't forget to use the sorting, and filter by tag as you wish.<br></br>
				You can also search in the following format: <br></br>
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-before:[Date] title<br></br>
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-after:[Date] title <br></br>
				&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-from:[Email] title <br></br> to get more specific result.<br></br>
				After finding the right question browse the previous answers, and add your own!
				</div>
				</div>
			)
		}else if(this.state.header.localeCompare('FAQ') === 0){
					return(
						<div className='FAQCon'>
						 	<div className='FAQ'>
						 What information can I find on the site?<br></br>
						 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-The information on the site is mostly about Wix products and platform.<br></br>
						 Who asks all the questions on the site?<br></br>
						 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-The Wix's users community asks the questions.<br></br>
						 Are the answers reliable?<br></br>
						 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-All the answers are from Wix Support Center, You can trust them a 100%!<br></br>
						 Who created the site?<br></br>
						 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-the site creator is Guy Davidson<br></br>
						 	</div>
						 </div>
					)
				}else {
					return;
				}
	}

	handleAboutClick = () => {
		if(this.state.header.localeCompare('about') === 0){
			this.setState({header:""})
		}else{
			this.setState({header:'about'})
		}
	}

	handleFAQClick = () => {
		if(this.state.header.localeCompare('FAQ') === 0){
			this.setState({header:""})
		}else{
			this.setState({header:'FAQ'})
		}
	}

	handleExpandClick = (clickedTicket: Ticket) => {
		if(this.state.featuredTicket !== undefined && clickedTicket.id !== this.state.featuredTicket.id){
			this.state.featuredTicket.isFeatured = false;
			let newTickets: Ticket[] = [this.state.featuredTicket, ...this.state.tickets];
			clickedTicket.isFeatured = true;
			this.setState({
				tickets: newTickets.filter((t: Ticket) => t.id !== clickedTicket.id),
				featuredTicket: clickedTicket,
			})
		}	else if(!this.state.showTicketView){
					let newTickets: Ticket[] = this.state.tickets.filter((t: Ticket) => t.id !== clickedTicket.id);
					this.setState({
						showTicketView: !this.state.showTicketView,
						featuredTicket: clickedTicket,
						tickets: newTickets
					})
			} else {
					let newTickets: Ticket[] = [...this.state.tickets];
					clickedTicket.isFeatured = false;

					let addBackFeaturedTicket: boolean = true;
					newTickets.forEach((t:Ticket) => {
						if(t.id === clickedTicket.id){
							addBackFeaturedTicket = false;
						}
					});
					if(addBackFeaturedTicket){
						newTickets.unshift(clickedTicket)
					}
					this.setState({
						showTicketView: !this.state.showTicketView,
						featuredTicket: undefined,
						tickets: newTickets
					})
				}

	}

	handleHideClick = (clickedTicket: Ticket) => {
	if(clickedTicket === undefined) return;

	let tickets:Ticket[] = [...this.state.tickets];
	let hiddenTickets:Ticket[] = [...this.state.hiddenTicketsList];


	tickets = tickets.filter((t:Ticket) => t.id !== clickedTicket.id)
	if(clickedTicket.isFeatured){
		clickedTicket.isFeatured = false;
	}
	hiddenTickets.push(clickedTicket);
	this.setState({
		hiddenTicketsList: hiddenTickets,
		tickets: tickets,
	})
	if(this.state.featuredTicket && this.state.featuredTicket.id.localeCompare(clickedTicket.id) === 0){
		this.setState({
			featuredTicket: undefined,
			showTicketView: !this.state.showTicketView,
		})
	}

}

	showFeaturedTicket = () => {
		const featuredTicket: Ticket | undefined = this.state.featuredTicket;
		if(featuredTicket === undefined) return;
		featuredTicket.isFeatured = true;
		let tickets: Ticket[] = [featuredTicket];

		return (<ul className='tickets'>
			{tickets.map((ticket) => (<TicketComponent key={ticket.id} handleExpandClick={this.handleExpandClick} patchStar={this.patchStar}
				ticket={ticket} patchAnswer={this.patchAnswer} patchTitle={this.patchTitle} handleHideClick={this.handleHideClick}/>))}
		</ul>);
	}

	restoreTickets = () => {
		let tickets = [...this.state.tickets];
		tickets.unshift(...this.state.hiddenTicketsList);
		this.setState({
			tickets:tickets,
			hiddenTicketsList:[],
		})
	}

	handleStarClick = () => {
		let ticketsShow: Ticket[] = []
		let ticketsNoShow: Ticket[] = []
		if(!this.state.staredTicketView){
			ticketsNoShow = [...this.state.hiddenTicketsList];
			this.state.tickets.forEach((t:Ticket) => {
				if(t.isStared){
					ticketsShow.push(t)
				} else {
					t.isStared = false;
					ticketsNoShow.push(t)
				}
			});
		} else {
			ticketsShow = [...this.state.tickets];
			ticketsNoShow = [];
			this.state.hiddenTicketsList.forEach((t:Ticket) => {
				if(t.isStared === undefined){
					ticketsNoShow.push(t);
				}
				else if(!t.isStared){
					ticketsShow.push(t);
				} else {
					ticketsNoShow.push(t);
				}
			})
		}
		this.setState({
			staredTicketView: !this.state.staredTicketView,
			tickets: ticketsShow,
			hiddenTicketsList: ticketsNoShow,
		})
	}

	render() {
		const {tickets} = this.state;

		return (
			<main>
				<div className='fullTicketsList'>
					<div className='siteHeading'>
						<img className='logo' alt='Wix Enter Logo'src={logo}></img>
					</div>
					<div className={this.state.showTicketView ? 'rightTicketsListFeature' : 'rightTicketsList'}>
						<div  className='ticketsListTitle'>
							<span className={this.state.header.localeCompare('about') === 0  ? 'secTitle press' : 'secTitle'} onClick={this.handleAboutClick}>About</span>
							<span className='mainTitle' onClick={() => this.setState({header:'list'})}>Tickets List</span>
							<span className={this.state.header.localeCompare('FAQ') === 0 ? 'secTitle press' : 'secTitle'} onClick={this.handleFAQClick}>FAQ</span>
						</div>
						<div className='screenPort'>
							<div className={this.state.showTicketView ? 'browse' : ''}>
								{this.state.header? this.renderHeader() : null}
								<header>
									<div className='searchBar'>
										<div><span style={{color:'white'}} className='fa fa-search'></span><input type="search" placeholder="Search..." onChange={(e) => this.onSearch(e.target.value)}/></div>
											<button onClick={() => {this.setState({superSearch: !this.state.superSearch})}} className={this.state.superSearch ? 'press' : ""}>Super Search</button>
									</div>
									<hr />
									<div className='sortBar'>
											<button className='clearSortBtn' onClick={() => this.sortTickets(SORT_DEFAULT)}>clear sort</button>
											<span>|</span>
											<button className={[SORT_DATE, SORT_DATE + SORT_DESC].includes(this.state.lastSort) ? 'press' : ""} onClick={() => this.sortTickets(SORT_DATE)}>sort by date</button>
											<span>|</span>
											<button className={[SORT_TITLE, SORT_TITLE + SORT_DESC].includes(this.state.lastSort) ? 'press' : ""} onClick={() => this.sortTickets(SORT_TITLE)}>sort by title</button>
											<span>|</span>
											<button className={[SORT_EMAIL, SORT_EMAIL + SORT_DESC].includes(this.state.lastSort) ? 'press' : ""} onClick={() => this.sortTickets(SORT_EMAIL)}>sort by email</button>
									</div>
									<div className='labelsAndStar'>
										<div className='labelsOUT'>{this.state.labels ? this.renderLabels() : null}</div>
										<div onClick={() => this.handleStarClick()} className='starButton'><i className="material-icons starIcon">star</i><div className='starText'>Tickets</div></div>
									</div>
								</header>
							<div className='results'>
								{tickets ? <div >Showing {tickets.length} results</div> : null }
								{this.state.responseTime ? <div>. &nbsp; (in {<span className={this.state.responseTime < 10 ? 'fastResults' : 'slowResults'}>{this.state.responseTime}</span>} ms)</div> : null}
								{this.state.hiddenTicketsList.length ? <span>, &nbsp;({this.state.hiddenTicketsList.length} hidden tickets - <span onClick={this.restoreTickets} className='restore'>restore</span>).</span> : null}
							</div>
							{this.state.showTicketView ? <hr className='hrResults'></hr> : null}
							<div className={this.state.showTicketView ? 'scrollResults' : ''}>
							  	{tickets ? this.renderTickets(tickets) : <h2>Loading..</h2>}
								{this.state.showTicketView ? <div className='getNextPageByClick' onClick={() => this.getNextPageByClick()}><i className="fa fa-angle-double-down"></i></div> : null}
							</div>
							{this.state.showTicketView ? <hr className='hrResults'></hr> : null}
							</div>
							<div className='feature'>
								{this.state.showTicketView ? this.showFeaturedTicket() : null}
							</div>
						</div>
					</div>
				</div>
		</main>)
	}
}

export default App;
